import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  computeActualStandings,
  type MatchInput,
  type ActualResultInput,
  type TeamInput,
} from '@/lib/simulation'
import { BRACKET_STRUCTURE, type ResolvedMatch } from '@/lib/bracket'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { UpcomingMatches } from '@/components/UpcomingMatches'
import { GroupStandingsTable } from '@/components/ui/GroupStandingsTable'
import { Card } from '@/components/ui/Card'
import { TournamentBracketView } from '@/components/bracket/TournamentBracketView'
import type { TeamStanding } from '@/lib/simulation'

export const dynamic = 'force-dynamic'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

type RawMatch = {
  id: number
  match_number: number
  stage: string
  group_letter: string | null
  home_team_id: number | null
  away_team_id: number | null
  scheduled_at: string | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  status: string
  home_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
  away_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
}

export default async function TournamentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawMatchesData }, { data: rawTeamsData }] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        id, match_number, stage, group_letter,
        home_team_id, away_team_id, scheduled_at,
        home_score, away_score, winner_team_id, status,
        home_team:teams!matches_home_team_id_fkey(id, name, short_code, flag_emoji, group_letter),
        away_team:teams!matches_away_team_id_fkey(id, name, short_code, flag_emoji, group_letter)
      `)
      .order('match_number', { ascending: true }),
    supabase.from('teams').select('id, name, short_code, flag_emoji, group_letter'),
  ])

  const allMatches = (rawMatchesData ?? []) as unknown as RawMatch[]
  const allTeams = (rawTeamsData ?? []) as unknown as TeamInput[]

  const groupMatches = allMatches.filter(m => m.stage === 'group')
  const knockoutMatches = allMatches.filter(m => m.stage !== 'group')

  // ── Compute group standings ──────────────────────────────────────────────────

  const matchesByGroup = new Map<string, MatchInput[]>()
  const teamsByGroup = new Map<string, Map<number, TeamInput>>()
  const resultsByGroup = new Map<string, ActualResultInput[]>()

  for (const m of groupMatches) {
    const letter = m.group_letter
    if (!letter || !m.home_team_id || !m.away_team_id) continue

    if (!matchesByGroup.has(letter)) { matchesByGroup.set(letter, []); teamsByGroup.set(letter, new Map()); resultsByGroup.set(letter, []) }

    matchesByGroup.get(letter)!.push({ id: m.id, match_number: m.match_number, group_letter: letter, home_team_id: m.home_team_id, away_team_id: m.away_team_id })

    const tMap = teamsByGroup.get(letter)!
    if (m.home_team && !tMap.has(m.home_team.id)) tMap.set(m.home_team.id, { ...m.home_team, group_letter: letter })
    if (m.away_team && !tMap.has(m.away_team.id)) tMap.set(m.away_team.id, { ...m.away_team, group_letter: letter })

    if (m.home_score != null && m.away_score != null) {
      resultsByGroup.get(letter)!.push({ match_id: m.id, home_score: m.home_score, away_score: m.away_score })
    }
  }

  const groupStandings = GROUP_LETTERS.map(letter => {
    const ms = matchesByGroup.get(letter) ?? []
    const ts = Array.from(teamsByGroup.get(letter)?.values() ?? [])
    const rs = resultsByGroup.get(letter) ?? []
    if (ms.length === 0) return { letter, teams: [] }
    const standings = computeActualStandings(letter, ms, rs, ts)
    const complete = rs.length === ms.length && ms.length === 6
    return {
      letter,
      complete,
      teams: standings.map(s => ({
        name: s.team_name,
        abbreviation: s.short_code,
        flag: s.flag_emoji,
        w: s.won,
        d: s.drawn,
        l: s.lost,
        pts: s.points,
      })),
    }
  })

  // ── Build bracket view data ──────────────────────────────────────────────────

  const bracketDefMap = new Map(BRACKET_STRUCTURE.map(d => [d.match_number, d]))

  function rawTeamToStanding(t: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string }): TeamStanding {
    return {
      team_id: t.id, team_name: t.name, short_code: t.short_code,
      flag_emoji: t.flag_emoji, group_letter: t.group_letter,
      played: 0, won: 0, drawn: 0, lost: 0,
      goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, position: 0,
    }
  }

  const knockoutResolved: ResolvedMatch[] = knockoutMatches.map(m => ({
    match_number: m.match_number,
    stage: m.stage as ResolvedMatch['stage'],
    label: bracketDefMap.get(m.match_number)?.label ?? `Match ${m.match_number}`,
    team_a: m.home_team ? rawTeamToStanding(m.home_team) : null,
    team_b: m.away_team ? rawTeamToStanding(m.away_team) : null,
    user_pick_team_id: null,
  }))

  const winnerMap: Record<number, number | null> = Object.fromEntries(
    knockoutMatches.map(m => [m.match_number, m.winner_team_id])
  )
  const kickoffMap: Record<number, string | null> = Object.fromEntries(
    knockoutMatches.map(m => [m.match_number, m.scheduled_at])
  )

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-display tracking-wide uppercase text-fg-primary mb-2">
          Tournament Hub
        </h1>
        <p className="text-fg-muted text-sm">
          Live standings, knockout results, and award races — all in one place.
        </p>
      </div>

      <UpcomingMatches />

      {/* ── Group Stage ── */}
      <section className="mb-12">
        <SectionHeading>Group Stage</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupStandings.map(g => (
            <GroupStandingsTable
              key={g.letter}
              groupLetter={g.letter}
              teams={g.teams}
              complete={g.complete ?? false}
            />
          ))}
        </div>
      </section>

      {/* ── Knockout Phase ── */}
      <section className="mb-12">
        <SectionHeading>Knockout Phase</SectionHeading>
        <TournamentBracketView
          resolvedMatches={knockoutResolved}
          winnerMap={winnerMap}
          kickoffMap={kickoffMap}
        />
      </section>

      {/* ── Golden Boot ── */}
      <section className="mb-12">
        <SectionHeading>Golden Boot</SectionHeading>
        <Card>
          <div className="flex items-start gap-4">
            <img src="/images/golden-boot.webp" alt="Golden Boot" className="w-20 h-20 object-contain shrink-0" />
            <div>
              <h3 className="font-display text-accent tracking-wider text-lg mb-1">GOLDEN BOOT</h3>
              <p className="text-fg-secondary text-sm mb-3">
                The race for the tournament&apos;s top goalscorer.
              </p>
              <p className="text-xs text-fg-muted bg-bg-elevated rounded px-3 py-2 font-mono">
                Top scorers will appear here
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
