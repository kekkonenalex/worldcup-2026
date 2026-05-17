import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BRACKET_STRUCTURE, type ResolvedMatch } from '@/lib/bracket'
import { BracketView } from '@/components/bracket/BracketView'
import type { TeamStanding } from '@/lib/simulation'

export const dynamic = 'force-dynamic'

type RawKnockoutMatch = {
  id: number
  match_number: number
  stage: string
  home_team_id: number | null
  away_team_id: number | null
  winner_team_id: number | null
  home_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
  away_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
}

function rawTeamToStanding(t: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string }): TeamStanding {
  return {
    team_id: t.id, team_name: t.name, short_code: t.short_code,
    flag_emoji: t.flag_emoji, group_letter: t.group_letter,
    played: 0, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, position: 0,
  }
}

export default async function TournamentBracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawData } = await supabase
    .from('matches')
    .select(`
      id, match_number, stage,
      home_team_id, away_team_id, winner_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_code, flag_emoji, group_letter),
      away_team:teams!matches_away_team_id_fkey(id, name, short_code, flag_emoji, group_letter)
    `)
    .neq('stage', 'group')
    .order('match_number', { ascending: true })

  const knockoutMatches = (rawData ?? []) as unknown as RawKnockoutMatch[]

  const bracketDefMap = new Map(BRACKET_STRUCTURE.map(d => [d.match_number, d]))

  const resolvedMatches: ResolvedMatch[] = knockoutMatches.map(m => ({
    match_number: m.match_number,
    stage: m.stage as ResolvedMatch['stage'],
    label: bracketDefMap.get(m.match_number)?.label ?? `Match ${m.match_number}`,
    team_a: m.home_team ? rawTeamToStanding(m.home_team) : null,
    team_b: m.away_team ? rawTeamToStanding(m.away_team) : null,
    user_pick_team_id: null,
  }))

  const actualWinnerMap = new Map(knockoutMatches.map(m => [m.match_number, m.winner_team_id]))

  return (
    <div className="pb-16">
      <Link
        href="/tournament"
        className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
      >
        ← Tournament Hub
      </Link>
      <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-6">
        Full Bracket
      </h1>
      <BracketView
        resolvedMatches={resolvedMatches}
        matchProps={(mn) => ({
          actualWinnerId: actualWinnerMap.get(mn) ?? undefined,
        })}
      />
    </div>
  )
}
