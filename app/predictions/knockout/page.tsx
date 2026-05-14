import { redirect } from 'next/navigation'
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
import {
  resolveBracket,
  type BracketContext,
  type ResolvedMatch,
} from '@/lib/bracket'
import { isPastDeadline } from '@/lib/config'
import KnockoutBracket from '@/components/KnockoutBracket'
import Link from 'next/link'
import type { MatchWithTeams, GroupPrediction, KnockoutPrediction } from '@/types/database'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

export default async function KnockoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch group stage matches with embedded team info
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

  // Fetch user's group predictions
  const { data: rawPreds } = await supabase
    .from('group_predictions')
    .select('*')
    .eq('user_id', user.id)

  const userGroupPreds = (rawPreds ?? []) as unknown as GroupPrediction[]

  if (userGroupPreds.length < 72) {
    redirect('/predictions')
  }

  // Fetch user's existing knockout predictions
  const { data: rawKoPreds } = await supabase
    .from('knockout_predictions')
    .select('*')
    .eq('user_id', user.id)

  const koPreds = (rawKoPreds ?? []) as unknown as KnockoutPrediction[]

  // Build per-group structures
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
    if (raw.home_team && !tMap.has(raw.home_team.id))
      tMap.set(raw.home_team.id, { ...raw.home_team, group_letter: letter })
    if (raw.away_team && !tMap.has(raw.away_team.id))
      tMap.set(raw.away_team.id, { ...raw.away_team, group_letter: letter })
  }

  const predictions: PredictionInput[] = userGroupPreds.map(p => ({
    match_id: p.match_id,
    predicted_home_score: p.predicted_home_score,
    predicted_away_score: p.predicted_away_score,
  }))

  // Run simulation
  const allGroupStandings: TeamStanding[][] = []
  try {
    for (const letter of GROUP_LETTERS) {
      const groupMatches = matchesByGroup.get(letter)
      const groupTeams = teamsByGroup.get(letter)
      if (!groupMatches || !groupTeams) continue
      allGroupStandings.push(
        computeGroupStandings(letter, groupMatches, predictions, Array.from(groupTeams.values()))
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Simulation failed.'
    return <ErrorPage message={msg} />
  }

  const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
  const advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)

  // Build userPicks Map from knockout predictions
  // bracket_position stores match_number (73-104)
  const userPicks = new Map<number, number>()
  for (const p of koPreds) userPicks.set(p.bracket_position, p.predicted_team_id)

  // Resolve the bracket
  const ctx: BracketContext = {
    groupStandings: allGroupStandings,
    thirdPlaceResult,
    userPicks,
  }

  let resolvedMatches: ResolvedMatch[]
  try {
    resolvedMatches = resolveBracket(ctx)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bracket resolution failed.'
    return <ErrorPage message={msg} />
  }

  const isLocked = isPastDeadline()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-5xl mx-auto">
        <Link href="/predictions/review" className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back to Standings Review
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Knockout Bracket</h1>
        <p className="text-gray-400 mt-1 max-w-2xl">
          Pick the winner of each match. Your bracket follows FIFA&apos;s official 2026 pairing
          rules — group winners face third-place qualifiers, and the bracket cascades through to
          the final at MetLife Stadium.
        </p>
      </header>

      <KnockoutBracket
        resolvedMatches={resolvedMatches}
        advancingTeams={advancingTeams}
        isLocked={isLocked}
      />
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-6">{message}</p>
        <Link href="/predictions" className="text-blue-400 hover:underline">
          ← Back to predictions
        </Link>
      </div>
    </main>
  )
}
