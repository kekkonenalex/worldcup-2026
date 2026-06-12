// Server-side group data for the Tournament Hub group modals.
// Pre-fetches all 12 groups in one pass and reuses the existing standings +
// scoring engines. Wrapped in unstable_cache so a sync (Phase 25) invalidating
// the matches/results tags refreshes the group modals automatically.

import { unstable_cache } from 'next/cache'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@/lib/cache'
import { scoreGroupMatch } from '@/lib/scoring'
import {
  computeActualStandings,
  type MatchInput,
  type ActualResultInput,
  type TeamInput,
} from '@/lib/simulation'
import type { Database } from '@/types/database'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export type GroupTeam = { id: string; name: string; code: string; flag: string }

export type GroupStandingRow = {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export type GroupResult = {
  matchId: number
  kickoffUtc: string | null
  home: { teamId: string; score: number }
  away: { teamId: string; score: number }
  userPrediction: { home: number; away: number } | null
  userPoints: number | null
}

export type GroupUpcoming = {
  matchId: number
  kickoffUtc: string | null
  home: { teamId: string }
  away: { teamId: string }
  userPrediction: { home: number; away: number } | null
}

export type GroupData = {
  groupId: string
  teams: GroupTeam[]
  standings: GroupStandingRow[]
  results: GroupResult[]
  upcoming: GroupUpcoming[]
}

// unstable_cache cannot read request cookies, so the cached fetch uses a
// service-role client (read-only here). userId is passed in explicitly.
function syncClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// kickoff ISO strings sort lexicographically == chronologically. Nulls last.
const ascByKickoff = (a: { kickoffUtc: string | null }, b: { kickoffUtc: string | null }) =>
  (a.kickoffUtc ?? '￿').localeCompare(b.kickoffUtc ?? '￿')
const descByKickoff = (a: { kickoffUtc: string | null }, b: { kickoffUtc: string | null }) =>
  (b.kickoffUtc ?? '').localeCompare(a.kickoffUtc ?? '')

async function fetchGroupData(userId: string): Promise<GroupData[]> {
  const supabase = syncClient()

  const [{ data: rawTeams }, { data: rawMatches }, { data: rawPreds }] = await Promise.all([
    supabase.from('teams').select('id, name, short_code, flag_emoji, group_letter'),
    supabase
      .from('matches')
      .select('id, match_number, group_letter, home_team_id, away_team_id, scheduled_at, home_score, away_score, status')
      .eq('stage', 'group')
      .order('match_number', { ascending: true }),
    supabase
      .from('group_predictions')
      .select('match_id, predicted_home_score, predicted_away_score')
      .eq('user_id', userId),
  ])

  type RawTeam = { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string }
  type RawMatch = {
    id: number; match_number: number; group_letter: string | null
    home_team_id: number | null; away_team_id: number | null; scheduled_at: string | null
    home_score: number | null; away_score: number | null; status: string
  }
  type RawPred = { match_id: number; predicted_home_score: number; predicted_away_score: number }

  const teams = (rawTeams ?? []) as unknown as RawTeam[]
  const matches = (rawMatches ?? []) as unknown as RawMatch[]
  const preds = (rawPreds ?? []) as unknown as RawPred[]

  const predByMatch = new Map<number, { home: number; away: number }>()
  for (const p of preds) {
    predByMatch.set(p.match_id, { home: p.predicted_home_score, away: p.predicted_away_score })
  }

  const teamsByGroup = new Map<string, RawTeam[]>()
  for (const t of teams) {
    if (!teamsByGroup.has(t.group_letter)) teamsByGroup.set(t.group_letter, [])
    teamsByGroup.get(t.group_letter)!.push(t)
  }

  const matchesByGroup = new Map<string, RawMatch[]>()
  for (const m of matches) {
    if (!m.group_letter) continue
    if (!matchesByGroup.has(m.group_letter)) matchesByGroup.set(m.group_letter, [])
    matchesByGroup.get(m.group_letter)!.push(m)
  }

  const isFinished = (m: RawMatch) => m.home_score != null && m.away_score != null

  return GROUP_LETTERS.map(letter => {
    const groupTeams = teamsByGroup.get(letter) ?? []
    const groupMatches = matchesByGroup.get(letter) ?? []

    const teamData: GroupTeam[] = groupTeams.map(t => ({
      id: String(t.id),
      name: t.name,
      code: t.short_code,
      flag: t.flag_emoji,
    }))

    // ── Standings (reuse computeActualStandings — FIFA tiebreakers + H2H) ──
    const matchInputs: MatchInput[] = groupMatches
      .filter(m => m.home_team_id != null && m.away_team_id != null)
      .map(m => ({
        id: m.id,
        match_number: m.match_number,
        group_letter: letter,
        home_team_id: m.home_team_id!,
        away_team_id: m.away_team_id!,
      }))
    const results: ActualResultInput[] = groupMatches
      .filter(isFinished)
      .map(m => ({ match_id: m.id, home_score: m.home_score!, away_score: m.away_score! }))
    const teamInputs: TeamInput[] = groupTeams.map(t => ({
      id: t.id, name: t.name, short_code: t.short_code, flag_emoji: t.flag_emoji, group_letter: letter,
    }))

    const standings: GroupStandingRow[] =
      matchInputs.length === 0
        ? []
        : computeActualStandings(letter, matchInputs, results, teamInputs).map(s => ({
            teamId: String(s.team_id),
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.goals_for,
            goalsAgainst: s.goals_against,
            goalDiff: s.goal_difference,
            points: s.points,
          }))

    // ── Results (finished, kickoff DESC) ──
    const groupResults: GroupResult[] = groupMatches
      .filter(m => isFinished(m) && m.home_team_id != null && m.away_team_id != null)
      .map(m => {
        const pred = predByMatch.get(m.id) ?? null
        const actual = { home: m.home_score!, away: m.away_score! }
        const userPoints = pred ? scoreGroupMatch(pred, actual) : null
        return {
          matchId: m.id,
          kickoffUtc: m.scheduled_at,
          home: { teamId: String(m.home_team_id), score: m.home_score! },
          away: { teamId: String(m.away_team_id), score: m.away_score! },
          userPrediction: pred,
          userPoints,
        }
      })
      .sort(descByKickoff)

    // ── Upcoming (not finished, kickoff ASC) ──
    const groupUpcoming: GroupUpcoming[] = groupMatches
      .filter(m => !isFinished(m) && m.home_team_id != null && m.away_team_id != null)
      .map(m => ({
        matchId: m.id,
        kickoffUtc: m.scheduled_at,
        home: { teamId: String(m.home_team_id) },
        away: { teamId: String(m.away_team_id) },
        userPrediction: predByMatch.get(m.id) ?? null,
      }))
      .sort(ascByKickoff)

    return { groupId: letter, teams: teamData, standings, results: groupResults, upcoming: groupUpcoming }
  })
}

export async function getGroupDataForHub(userId: string): Promise<GroupData[]> {
  return unstable_cache(
    () => fetchGroupData(userId),
    ['group-data-hub', userId],
    { tags: [CACHE_TAGS.matches, CACHE_TAGS.results, CACHE_TAGS.predictions(userId)] }
  )()
}
