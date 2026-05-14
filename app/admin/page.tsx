import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import AdminMatchResults from '@/components/AdminMatchResults'
import type { Match, Team } from '@/types/database'

export type AdminMatch = Match & {
  home_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
  away_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
}

export type AdminTeam = { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string }

export default async function AdminPage() {
  await requireAdmin()

  const supabase = await createClient()

  const [{ data: rawMatches }, { data: rawTeams }] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, short_code, flag_emoji, group_letter),
        away_team:teams!matches_away_team_id_fkey(id, name, short_code, flag_emoji, group_letter)
      `)
      .order('match_number', { ascending: true }),
    supabase
      .from('teams')
      .select('id, name, short_code, flag_emoji, group_letter')
      .order('group_letter')
      .order('name'),
  ])

  const matches = (rawMatches ?? []) as unknown as AdminMatch[]
  const teams = (rawTeams ?? []) as unknown as AdminTeam[]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Admin — Match Results</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Enter actual match results. Group stage results auto-populate the knockout bracket.
          Knockout winners cascade to the next round automatically.
        </p>
      </header>

      <AdminMatchResults matches={matches} teams={teams} />
    </div>
  )
}
