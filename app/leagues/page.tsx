import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LeaguesList from '@/components/LeaguesList'

export type LeagueItem = {
  id: number
  name: string
  invite_code: string
  member_count: number
  created_by: string
  is_creator: boolean
}

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawMemberships } = await supabase
    .from('league_memberships')
    .select('league_id, league:leagues(id, name, invite_code, created_by, created_at)')
    .eq('user_id', user.id)

  type RawRow = { league_id: number; league: { id: number; name: string; invite_code: string; created_by: string; created_at: string } | null }
  const rows = (rawMemberships ?? []) as unknown as RawRow[]
  const userLeagues = rows.map(r => r.league).filter((l): l is NonNullable<typeof l> => l !== null)
  const leagueIds = userLeagues.map(l => l.id)

  const countMap = new Map<number, number>()
  if (leagueIds.length > 0) {
    const { data: allMems } = await supabase.from('league_memberships').select('league_id').in('league_id', leagueIds)
    for (const m of (allMems ?? []) as unknown as { league_id: number }[]) {
      countMap.set(m.league_id, (countMap.get(m.league_id) ?? 0) + 1)
    }
  }

  const leagues: LeagueItem[] = userLeagues.map(l => ({
    id: l.id, name: l.name, invite_code: l.invite_code,
    member_count: countMap.get(l.id) ?? 1,
    created_by: l.created_by, is_creator: l.created_by === user.id,
  }))

  return (
    <div className="pb-16">
      <div className="mb-8">
        <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
          ← Home
        </Link>
        <h1 className="text-5xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-2">My Leagues</h1>
        <p className="text-fg-muted text-sm max-w-lg">
          Compete with friends and colleagues. Create a league and share the invite code, or join one with someone else&apos;s code.
        </p>
      </div>

      <LeaguesList leagues={leagues} currentUserId={user.id} />
    </div>
  )
}
