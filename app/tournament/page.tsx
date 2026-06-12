import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BRACKET_STRUCTURE, type ResolvedMatch } from '@/lib/bracket'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { UpcomingMatches } from '@/components/UpcomingMatches'
import { GroupCardsGrid } from '@/components/tournament/GroupCardsGrid'
import { getGroupDataForHub } from '@/lib/tournament/group-data'
import { Card } from '@/components/ui/Card'
import { TournamentBracketView } from '@/components/bracket/TournamentBracketView'
import { TopScorers } from '@/components/TopScorers'
import type { TeamStanding } from '@/lib/simulation'

export const dynamic = 'force-dynamic'

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

  const [{ data: rawMatchesData }, groups] = await Promise.all([
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
    getGroupDataForHub(user.id),
  ])

  const allMatches = (rawMatchesData ?? []) as unknown as RawMatch[]
  const knockoutMatches = allMatches.filter(m => m.stage !== 'group')

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
        <p className="text-fg-muted text-xs mb-4">Tap a group for standings, results, and your predictions.</p>
        <GroupCardsGrid groups={groups} />
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
          <div className="flex items-start gap-4 mb-4">
            <img src="/images/golden-boot.webp" alt="Golden Boot" className="w-14 h-14 object-contain shrink-0" />
            <div>
              <h3 className="font-display text-accent tracking-wider text-lg mb-1">TOP SCORERS</h3>
              <p className="text-fg-secondary text-sm">
                The race for the tournament&apos;s top goalscorer.
              </p>
            </div>
          </div>
          <TopScorers />
        </Card>
      </section>
    </div>
  )
}
