import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
import AwardsForm from '@/components/AwardsForm'
import type { AwardPrediction } from '@/types/database'

export default async function AwardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Must complete group stage first
  const { count: groupCount } = await supabase
    .from('group_predictions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((groupCount ?? 0) < 72) redirect('/predictions')

  // Must complete knockout bracket first
  const { count: knockoutCount } = await supabase
    .from('knockout_predictions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((knockoutCount ?? 0) < 32) redirect('/predictions/knockout')

  // Fetch existing award predictions (may be null)
  const { data: rows } = await supabase
    .from('award_predictions')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)

  const initial = (rows?.[0] ?? null) as AwardPrediction | null
  const isLocked = isPastDeadline()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto">
        <Link href="/predictions/knockout" className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back to Knockout Bracket
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Tournament Awards</h1>
        <p className="text-gray-400 mt-1">
          Pick the players you think will win each award. Worth significant bonus points.
        </p>
      </header>

      <AwardsForm initial={initial} isLocked={isLocked} />
    </div>
  )
}
