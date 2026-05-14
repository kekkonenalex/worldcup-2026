import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
import GroupStagePredictionForm from '@/components/GroupStagePredictionForm'
import type { MatchWithTeams, GroupPrediction } from '@/types/database'

export default async function PredictionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select(`
      id, match_number, group_letter, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)
    `)
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  if (matchError || !matchData || matchData.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Could not load matches</h1>
          <p className="text-gray-400 mb-6">
            {matchError?.message ?? 'No group stage matches found. Make sure the database has been seeded.'}
          </p>
          <Link href="/dashboard" className="text-blue-400 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  const matches = matchData as unknown as MatchWithTeams[]

  // Group by letter on the server
  const groupedMatches: Record<string, MatchWithTeams[]> = {}
  for (const match of matches) {
    if (!match.group_letter) continue
    if (!groupedMatches[match.group_letter]) groupedMatches[match.group_letter] = []
    groupedMatches[match.group_letter].push(match)
  }

  const { data: predData } = await supabase
    .from('group_predictions')
    .select('*')
    .eq('user_id', user.id)

  const existingPredictions = (predData ?? []) as unknown as GroupPrediction[]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Group Stage Predictions</h1>
        <p className="text-gray-400 mt-1">
          Predict the score of every group stage match. Auto-saves as you type.
        </p>
      </header>

      <GroupStagePredictionForm
        groupedMatches={groupedMatches}
        existingPredictions={existingPredictions}
        isLocked={isPastDeadline()}
      />
    </div>
  )
}
