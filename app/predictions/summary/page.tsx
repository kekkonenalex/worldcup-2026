import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
import {
  computeGroupStandings,
  rankThirdPlaceTeams,
  getAdvancingTeams,
  type MatchInput,
  type PredictionInput,
  type TeamInput,
  type TeamStanding,
} from '@/lib/simulation'
import {
  resolveBracket,
  type BracketContext,
  type ResolvedMatch,
} from '@/lib/bracket'
import PredictionsSummary from '@/components/PredictionsSummary'
import type { MatchWithTeams, GroupPrediction, KnockoutPrediction, AwardPrediction } from '@/types/database'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export type GroupMatchSummary = {
  match_number: number
  group_letter: string
  home_name: string
  home_flag: string
  home_code: string
  away_name: string
  away_flag: string
  away_code: string
  home_score: number | null
  away_score: number | null
}

export type CompletionStatus = {
  groupComplete: boolean
  knockoutComplete: boolean
  awardsComplete: boolean
  allComplete: boolean
  groupCount: number
  knockoutCount: number
  awardsCount: number
}

function countAwards(award: AwardPrediction | null): number {
  if (!award) return 0
  return [
    award.golden_boot_player?.trim(),
    award.golden_boot_goals != null ? String(award.golden_boot_goals) : '',
    award.golden_ball_player?.trim(),
    award.golden_glove_player?.trim(),
    award.best_young_player?.trim(),
  ].filter(v => v && v !== '').length
}

export default async function SummaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch group matches with teams
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id, match_number, group_letter, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)
    `)
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  const matches = (rawMatches ?? []) as unknown as MatchWithTeams[]

  // Fetch group predictions
  const { data: rawGroupPreds } = await supabase
    .from('group_predictions')
    .select('*')
    .eq('user_id', user.id)

  const groupPreds = (rawGroupPreds ?? []) as unknown as GroupPrediction[]

  // Fetch knockout predictions
  const { data: rawKoPreds } = await supabase
    .from('knockout_predictions')
    .select('*')
    .eq('user_id', user.id)

  const koPreds = (rawKoPreds ?? []) as unknown as KnockoutPrediction[]

  // Fetch award predictions
  const { data: awardRows } = await supabase
    .from('award_predictions')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)

  const awardPrediction = (awardRows?.[0] ?? null) as AwardPrediction | null

  // Completion status
  const groupCount = groupPreds.length
  const knockoutCount = koPreds.length
  const awardsCount = countAwards(awardPrediction)

  const groupComplete = groupCount === 72
  const knockoutComplete = knockoutCount === 32
  const awardsComplete = awardsCount === 5

  const completion: CompletionStatus = {
    groupComplete,
    knockoutComplete,
    awardsComplete,
    allComplete: groupComplete && knockoutComplete && awardsComplete,
    groupCount,
    knockoutCount,
    awardsCount,
  }

  // Build group match summaries (all 72 matches with prediction overlay)
  const predMap = new Map<number, GroupPrediction>()
  for (const p of groupPreds) predMap.set(p.match_id, p)

  const groupMatchSummaries: GroupMatchSummary[] = matches.map(m => {
    const pred = predMap.get(m.id)
    return {
      match_number: m.match_number,
      group_letter: m.group_letter ?? '',
      home_name: m.home_team?.name ?? '',
      home_flag: m.home_team?.flag_emoji ?? '',
      home_code: m.home_team?.short_code ?? '',
      away_name: m.away_team?.name ?? '',
      away_flag: m.away_team?.flag_emoji ?? '',
      away_code: m.away_team?.short_code ?? '',
      home_score: pred?.predicted_home_score ?? null,
      away_score: pred?.predicted_away_score ?? null,
    }
  })

  // Run simulation + resolve bracket only if group stage is complete
  let advancingTeams: TeamStanding[] = []
  let knockoutResolvedMatches: ResolvedMatch[] = []

  if (groupComplete) {
    const matchesByGroup = new Map<string, MatchInput[]>()
    const teamsByGroup = new Map<string, Map<number, TeamInput>>()

    for (const raw of matches) {
      const letter = raw.group_letter
      if (!letter) continue
      if (!matchesByGroup.has(letter)) matchesByGroup.set(letter, [])
      if (!teamsByGroup.has(letter)) teamsByGroup.set(letter, new Map())

      matchesByGroup.get(letter)!.push({
        id: raw.id,
        match_number: raw.match_number,
        group_letter: letter,
        home_team_id: raw.home_team_id!,
        away_team_id: raw.away_team_id!,
      })

      const tMap = teamsByGroup.get(letter)!
      if (raw.home_team && !tMap.has(raw.home_team.id))
        tMap.set(raw.home_team.id, { ...raw.home_team, group_letter: letter })
      if (raw.away_team && !tMap.has(raw.away_team.id))
        tMap.set(raw.away_team.id, { ...raw.away_team, group_letter: letter })
    }

    const predictions: PredictionInput[] = groupPreds.map(p => ({
      match_id: p.match_id,
      predicted_home_score: p.predicted_home_score,
      predicted_away_score: p.predicted_away_score,
    }))

    const allGroupStandings: TeamStanding[][] = []
    try {
      for (const letter of GROUP_LETTERS) {
        const gm = matchesByGroup.get(letter)
        const gt = teamsByGroup.get(letter)
        if (!gm || !gt) continue
        allGroupStandings.push(
          computeGroupStandings(letter, gm, predictions, Array.from(gt.values()))
        )
      }

      const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
      advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)

      const userPicks = new Map<number, number>()
      for (const p of koPreds) userPicks.set(p.bracket_position, p.predicted_team_id)

      const ctx: BracketContext = {
        groupStandings: allGroupStandings,
        thirdPlaceResult,
        userPicks,
      }
      knockoutResolvedMatches = resolveBracket(ctx)
    } catch {
      // Simulation error — show summary without knockout resolution
    }
  }

  const isLocked = isPastDeadline()

  return (
    <div className="pb-16">
      <div className="mb-6">
        <Link href="/predictions/awards" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
          ← Awards Predictions
        </Link>
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-1">Predictions Summary</h1>
      </div>

      <PredictionsSummary
        groupMatchSummaries={groupMatchSummaries}
        knockoutResolvedMatches={knockoutResolvedMatches}
        awardPrediction={awardPrediction}
        completion={completion}
        advancingTeams={advancingTeams}
        isLocked={isLocked}
      />
    </div>
  )
}
