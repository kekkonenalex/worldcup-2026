import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline } from '@/lib/config'
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
import PredictionsSummary from '@/components/PredictionsSummary'
import type { MatchWithTeams, GroupPrediction, KnockoutPrediction, AwardPrediction, Profile } from '@/types/database'
import type { GroupMatchSummary, CompletionStatus } from '@/app/predictions/summary/page'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

function countAwards(award: AwardPrediction | null): number {
  if (!award) return 0
  return [
    award.golden_boot_player?.trim() || '',
    award.golden_boot_goals != null ? '1' : '',
    award.golden_ball_player?.trim() || '',
    award.golden_glove_player?.trim() || '',
    award.best_young_player?.trim() || '',
  ].filter(Boolean).length
}

export default async function MemberPredictionsPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>
}) {
  const { id, userId } = await params
  const leagueId = parseInt(id, 10)
  if (isNaN(leagueId)) redirect('/leagues')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify current user is a league member
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .limit(1)

  if (!membership || (membership as unknown[]).length === 0) {
    redirect('/leagues')
  }

  // Fetch league name for the back link
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', leagueId)
    .limit(1)

  const leagueName = (leagueRows as unknown as { name: string }[])?.[0]?.name ?? 'League'

  // If before deadline, don't reveal anything
  const deadlinePassed = isPastDeadline()
  if (!deadlinePassed) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-3">Predictions locked until deadline</h1>
          <p className="text-gray-400 mb-6">
            You&apos;ll be able to see each other&apos;s predictions once the prediction deadline has passed.
          </p>
          <Link
            href={`/leagues/${leagueId}`}
            className="inline-block rounded-lg border border-gray-600 hover:border-gray-400 px-6 py-2.5 font-medium text-gray-300 hover:text-white transition-colors"
          >
            ← Back to {leagueName}
          </Link>
        </div>
      </main>
    )
  }

  // Verify target user is also a league member
  const { data: targetMembership } = await supabase
    .from('league_memberships')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .limit(1)

  if (!targetMembership || (targetMembership as unknown[]).length === 0) {
    redirect(`/leagues/${leagueId}`)
  }

  // Fetch target user's profile
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', userId)
    .limit(1)

  const targetProfile = (profileRows as unknown as Profile[] | null)?.[0]
  const subjectName = targetProfile?.display_name ?? 'Unknown'

  // Fetch group matches (needed to build summaries and run simulation)
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id, match_number, group_letter, home_team_id, away_team_id,
      home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)
    `)
    .eq('stage', 'group')
    .order('match_number', { ascending: true })

  const matches = (rawMatches ?? []) as unknown as MatchWithTeams[]

  // Fetch target user's predictions
  const [
    { data: rawGroupPreds },
    { data: rawKoPreds },
    { data: awardRows },
  ] = await Promise.all([
    supabase.from('group_predictions').select('*').eq('user_id', userId),
    supabase.from('knockout_predictions').select('*').eq('user_id', userId),
    supabase.from('award_predictions').select('*').eq('user_id', userId).limit(1),
  ])

  const groupPreds = (rawGroupPreds ?? []) as unknown as GroupPrediction[]
  const koPreds = (rawKoPreds ?? []) as unknown as KnockoutPrediction[]
  const awardPrediction = (awardRows?.[0] ?? null) as AwardPrediction | null

  const groupCount = groupPreds.length
  const knockoutCount = koPreds.length
  const awardsCount = countAwards(awardPrediction)
  const groupComplete = groupCount === 72
  const knockoutComplete = knockoutCount === 32
  const awardsComplete = awardsCount === 5

  const completion: CompletionStatus = {
    groupComplete,
    knockoutComplete,
    awardsComplete,
    allComplete: groupComplete && knockoutComplete && awardsComplete,
    groupCount,
    knockoutCount,
    awardsCount,
  }

  // Build group match summaries
  const predMap = new Map<number, GroupPrediction>()
  for (const p of groupPreds) predMap.set(p.match_id, p)

  const groupMatchSummaries: GroupMatchSummary[] = matches.map(m => {
    const pred = predMap.get(m.id)
    return {
      match_number: m.match_number,
      group_letter: m.group_letter ?? '',
      home_name: m.home_team?.name ?? '',
      home_flag: m.home_team?.flag_emoji ?? '',
      home_code: m.home_team?.short_code ?? '',
      away_name: m.away_team?.name ?? '',
      away_flag: m.away_team?.flag_emoji ?? '',
      away_code: m.away_team?.short_code ?? '',
      home_score: pred?.predicted_home_score ?? null,
      away_score: pred?.predicted_away_score ?? null,
    }
  })

  // Run simulation and resolve bracket if group stage complete
  let advancingTeams: TeamStanding[] = []
  let knockoutResolvedMatches: ResolvedMatch[] = []

  if (groupComplete) {
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

    const predictions: PredictionInput[] = groupPreds.map(p => ({
      match_id: p.match_id,
      predicted_home_score: p.predicted_home_score,
      predicted_away_score: p.predicted_away_score,
    }))

    try {
      const allGroupStandings: TeamStanding[][] = []
      for (const letter of GROUP_LETTERS) {
        const gm = matchesByGroup.get(letter)
        const gt = teamsByGroup.get(letter)
        if (!gm || !gt) continue
        allGroupStandings.push(
          computeGroupStandings(letter, gm, predictions, Array.from(gt.values()))
        )
      }

      const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
      advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)

      const userPicks = new Map<number, number>()
      for (const p of koPreds) userPicks.set(p.bracket_position, p.predicted_team_id)

      const ctx: BracketContext = {
        groupStandings: allGroupStandings,
        thirdPlaceResult,
        userPicks,
      }
      knockoutResolvedMatches = resolveBracket(ctx)
    } catch {
      // Simulation error — show without bracket resolution
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <Link href={`/leagues/${leagueId}`} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back to {leagueName}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">{subjectName}&apos;s Predictions</h1>
      </header>

      <PredictionsSummary
        groupMatchSummaries={groupMatchSummaries}
        knockoutResolvedMatches={knockoutResolvedMatches}
        awardPrediction={awardPrediction}
        completion={completion}
        advancingTeams={advancingTeams}
        isLocked={true}
        viewOnly={true}
        subjectName={subjectName}
      />
    </div>
  )
}
