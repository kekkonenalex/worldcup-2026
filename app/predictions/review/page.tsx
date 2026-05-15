import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  computeGroupStandings,
  rankThirdPlaceTeams,
  getAdvancingTeams,
  type MatchInput,
  type PredictionInput,
  type TeamInput,
  type TeamStanding,
} from '@/lib/simulation'
import StandingsReview from '@/components/StandingsReview'
import type { MatchWithTeams, GroupPrediction } from '@/types/database'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch all group stage matches with embedded team info
  const { data: rawMatches, error: matchError } = await supabase
    .from('matches')
    .select(`
      id, match_number, group_letter, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)
    `)
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  if (matchError || !rawMatches) {
    return <ErrorPage message={matchError?.message ?? 'Failed to load matches.'} />
  }

  const matches = rawMatches as unknown as MatchWithTeams[]

  // Fetch user's predictions
  const { data: rawPreds } = await supabase
    .from('group_predictions')
    .select('*')
    .eq('user_id', user.id)

  const userPredictions = (rawPreds ?? []) as unknown as GroupPrediction[]

  const predictionCount = userPredictions.length

  // Not enough predictions — show incomplete prompt
  if (predictionCount < 72) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-fg-primary mb-3">Predictions incomplete</h1>
          <p className="text-fg-muted mb-2">
            You need to predict all 72 group stage matches to review your standings.
          </p>
          <p className="text-3xl font-bold text-accent mb-8">
            {predictionCount} / 72
          </p>
          <Link
            href="/predictions"
            className="inline-block rounded-lg bg-accent text-accent-fg px-6 py-2.5 font-semibold transition-colors hover:bg-accent-hover"
          >
            ← Back to predictions
          </Link>
        </div>
      </div>
    )
  }

  // Build per-group data structures
  const matchesByGroup = new Map<string, MatchInput[]>()
  const teamsByGroup = new Map<string, Map<number, TeamInput>>()

  for (const raw of matches) {
    const letter = raw.group_letter
    if (!letter) continue

    if (!matchesByGroup.has(letter)) matchesByGroup.set(letter, [])
    if (!teamsByGroup.has(letter)) teamsByGroup.set(letter, new Map())

    matchesByGroup.get(letter)!.push({
      id: raw.id,
      match_number: raw.match_number,
      group_letter: letter,
      home_team_id: raw.home_team_id!,
      away_team_id: raw.away_team_id!,
    })

    const tMap = teamsByGroup.get(letter)!
    if (raw.home_team && !tMap.has(raw.home_team.id)) {
      tMap.set(raw.home_team.id, { ...raw.home_team, group_letter: letter })
    }
    if (raw.away_team && !tMap.has(raw.away_team.id)) {
      tMap.set(raw.away_team.id, { ...raw.away_team, group_letter: letter })
    }
  }

  const predictions: PredictionInput[] = userPredictions.map(p => ({
    match_id: p.match_id,
    predicted_home_score: p.predicted_home_score,
    predicted_away_score: p.predicted_away_score,
  }))

  // Run simulation for each group
  const allGroupStandings: TeamStanding[][] = []
  try {
    for (const letter of GROUP_LETTERS) {
      const groupMatches = matchesByGroup.get(letter)
      const groupTeams = teamsByGroup.get(letter)
      if (!groupMatches || !groupTeams) continue

      const standings = computeGroupStandings(
        letter,
        groupMatches,
        predictions,
        Array.from(groupTeams.values())
      )
      allGroupStandings.push(standings)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Simulation failed.'
    return <ErrorPage message={msg} />
  }

  const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
  const advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)

  return (
    <div className="pb-16">
      <div className="mb-6">
        <Link href="/predictions" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
          ← Adjust my predictions
        </Link>
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mt-3 mb-1">Simulated Standings</h1>
        <p className="text-fg-muted text-sm">
          Here is how the group stage would finish based on your predictions.
          You can adjust if anything looks off.
        </p>
      </div>

      <StandingsReview
        groupStandings={allGroupStandings}
        thirdPlaceResult={thirdPlaceResult}
        advancingTeams={advancingTeams}
      />
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-fg-primary mb-3">Something went wrong</h1>
        <p className="text-fg-muted mb-6">{message}</p>
        <Link href="/predictions" className="text-accent hover:underline">
          ← Back to predictions
        </Link>
      </div>
    </div>
  )
}
