import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
import GroupStagePredictionForm from '@/components/GroupStagePredictionForm'
import type { MatchWithTeams, GroupPrediction } from '@/types/database'

export default async function PredictionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select(`id, match_number, group_letter, home_team_id, away_team_id, home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji), away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)`)
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  if (matchError || !matchData || matchData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fg-primary mb-2">Could not load matches</h1>
          <p className="text-fg-muted mb-6">{matchError?.message ?? 'No group stage matches found.'}</p>
          <Link href="/dashboard" className="text-accent hover:underline text-sm">← Dashboard</Link>
        </div>
      </div>
    )
  }

  const matches = matchData as unknown as MatchWithTeams[]
  const groupedMatches: Record<string, MatchWithTeams[]> = {}
  for (const match of matches) {
    if (!match.group_letter) continue
    if (!groupedMatches[match.group_letter]) groupedMatches[match.group_letter] = []
    groupedMatches[match.group_letter].push(match)
  }

  const { data: predData } = await supabase.from('group_predictions').select('*').eq('user_id', user.id)
  const existingPredictions = (predData ?? []) as unknown as GroupPrediction[]

  return (
    <div className="pb-16">
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-1">Group Stage</h1>
        <p className="text-fg-muted text-sm">Predict the score of every group stage match. Auto-saves as you type.</p>
      </div>

      <GroupStagePredictionForm
        groupedMatches={groupedMatches}
        existingPredictions={existingPredictions}
        isLocked={isPastDeadline()}
      />
    </div>
  )
}
