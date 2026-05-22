import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import AdminMatchResults from '@/components/AdminMatchResults'
import AdminReminderTrigger from '@/components/AdminReminderTrigger'
import type { Match, Team } from '@/types/database'

export type AdminMatch = Match & {
  home_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
  away_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
}

export type AdminTeam = { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string }

export default async function AdminPage() {
  await requireAdmin()

  const supabase = await createClient()

  const [{ data: rawMatches }, { data: rawTeams }, { count: externalIdCount }] = await Promise.all([
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
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .not('external_id', 'is', null),
  ])

  const matches = (rawMatches ?? []) as unknown as AdminMatch[]
  const teams = (rawTeams ?? []) as unknown as AdminTeam[]
  const hasSomeExternalIds = (externalIdCount ?? 0) > 0

  return (
    <div className="pb-16">
      <div className="mb-6">
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mb-1">Admin — Match Results</h1>
        <p className="text-fg-muted text-sm">
          Enter actual match results. Group stage results auto-populate the knockout bracket.
          Knockout winners cascade to the next round automatically.
        </p>
      </div>

      <AdminMatchResults matches={matches} teams={teams} hasSomeExternalIds={hasSomeExternalIds} />
      <AdminReminderTrigger />
    </div>
  )
}
