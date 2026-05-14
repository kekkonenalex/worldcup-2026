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

  // Fetch all leagues this user belongs to
  const { data: rawMemberships } = await supabase
    .from('league_memberships')
    .select('league_id, league:leagues(id, name, invite_code, created_by, created_at)')
    .eq('user_id', user.id)

  type RawRow = {
    league_id: number
    league: {
      id: number
      name: string
      invite_code: string
      created_by: string
      created_at: string
    } | null
  }

  const rows = (rawMemberships ?? []) as unknown as RawRow[]
  const userLeagues = rows.map(r => r.league).filter((l): l is NonNullable<typeof l> => l !== null)
  const leagueIds = userLeagues.map(l => l.id)

  // Batch-fetch member counts for all leagues
  const countMap = new Map<number, number>()
  if (leagueIds.length > 0) {
    const { data: allMems } = await supabase
      .from('league_memberships')
      .select('league_id')
      .in('league_id', leagueIds)

    for (const m of (allMems ?? []) as unknown as { league_id: number }[]) {
      countMap.set(m.league_id, (countMap.get(m.league_id) ?? 0) + 1)
    }
  }

  const leagues: LeagueItem[] = userLeagues.map(l => ({
    id: l.id,
    name: l.name,
    invite_code: l.invite_code,
    member_count: countMap.get(l.id) ?? 1,
    created_by: l.created_by,
    is_creator: l.created_by === user.id,
  }))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">My Leagues</h1>
        <p className="text-gray-400 mt-1">
          Compete with friends. Create a league and share the invite code, or join one with someone else&apos;s code.
        </p>
      </header>

      <LeaguesList leagues={leagues} currentUserId={user.id} />
    </div>
  )
}
