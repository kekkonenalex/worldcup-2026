import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isPastDeadline, PREDICTION_DEADLINE, timeUntilDeadline } from '@/lib/config'
import { canViewPredictions } from '@/lib/access'
import { getAllUserScores } from '@/lib/scoring-server'
import {
  computeGroupStandings,
  rankThirdPlaceTeams,
  getAdvancingTeams,
  type MatchInput,
  type PredictionInput,
  type TeamInput,
  type TeamStanding,
} from '@/lib/simulation'
import { resolveBracket, type BracketContext, type ResolvedMatch } from '@/lib/bracket'
import PredictionsSummary from '@/components/PredictionsSummary'
import type { MatchWithTeams, GroupPrediction, KnockoutPrediction, AwardPrediction, Profile } from '@/types/database'
import type { GroupMatchSummary, CompletionStatus } from '@/app/predictions/summary/page'

export const dynamic = 'force-dynamic'

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

function ScoreCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${accent ? 'border-yellow-700 bg-yellow-900/10' : 'border-gray-800 bg-gray-900/60'}`}>
      <div className={`text-xs mb-0.5 ${accent ? 'text-yellow-500' : 'text-gray-500'}`}>{label}</div>
      <div className="text-xl font-bold text-white tabular-nums">{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: targetUserId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch target profile
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', targetUserId)
    .limit(1)

  const targetProfile = (profileRows as unknown as Pick<Profile, 'id' | 'display_name'>[] | null)?.[0]
  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">User not found.</p>
          <Link href="/leaderboard" className="text-blue-400 hover:underline text-sm">
            ← Leaderboard
          </Link>
        </div>
      </div>
    )
  }

  const isSelf = user.id === targetUserId

  // Fetch all scores (needed for rank) and check access in parallel
  const [allScores, access] = await Promise.all([
    getAllUserScores(supabase),
    canViewPredictions({ viewerId: user.id, targetUserId, supabase }),
  ])

  const userEntry = allScores.find(s => s.userId === targetUserId)
  const globalRank = userEntry?.rank ?? null
  const breakdown = userEntry?.breakdown

  // ── Predictions section ───────────────────────────────────────────────────────
  // Only fetch prediction detail data if access is allowed.

  let groupMatchSummaries: GroupMatchSummary[] = []
  let knockoutResolvedMatches: ResolvedMatch[] = []
  let advancingTeams: TeamStanding[] = []
  let completion: CompletionStatus = {
    groupComplete: false,
    knockoutComplete: false,
    awardsComplete: false,
    allComplete: false,
    groupCount: 0,
    knockoutCount: 0,
    awardsCount: 0,
  }
  let awardPrediction: AwardPrediction | null = null

  if (access.allowed) {
    // Fetch matches + predictions in parallel
    const [
      { data: rawMatches },
      { data: rawGroupPreds },
      { data: rawKoPreds },
      { data: awardRows },
    ] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          id, match_number, group_letter, home_team_id, away_team_id,
          home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji),
          away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)
        `)
        .eq('stage', 'group')
        .order('match_number', { ascending: true }),
      supabase.from('group_predictions').select('*').eq('user_id', targetUserId),
      supabase.from('knockout_predictions').select('*').eq('user_id', targetUserId),
      supabase.from('award_predictions').select('*').eq('user_id', targetUserId).limit(1),
    ])

    const matches = (rawMatches ?? []) as unknown as MatchWithTeams[]
    const groupPreds = (rawGroupPreds ?? []) as unknown as GroupPrediction[]
    const koPreds = (rawKoPreds ?? []) as unknown as KnockoutPrediction[]
    awardPrediction = (awardRows?.[0] ?? null) as AwardPrediction | null

    const groupCount = groupPreds.length
    const knockoutCount = koPreds.length
    const awardsCount = countAwards(awardPrediction)
    const groupComplete = groupCount === 72
    const knockoutComplete = knockoutCount === 32
    const awardsComplete = awardsCount === 5

    completion = {
      groupComplete,
      knockoutComplete,
      awardsComplete,
      allComplete: groupComplete && knockoutComplete && awardsComplete,
      groupCount,
      knockoutCount,
      awardsCount,
    }

    const predMap = new Map<number, GroupPrediction>()
    for (const p of groupPreds) predMap.set(p.match_id, p)

    groupMatchSummaries = matches.map(m => {
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
        const allGroupStandings = GROUP_LETTERS.map(letter => {
          const gm = matchesByGroup.get(letter) ?? []
          const gt = Array.from(teamsByGroup.get(letter)?.values() ?? [])
          return computeGroupStandings(letter, gm, predictions, gt)
        }).filter(s => s.length > 0)

        const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
        advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)

        const userPicks = new Map<number, number>()
        for (const p of koPreds) userPicks.set(p.bracket_position, p.predicted_team_id)

        const ctx: BracketContext = { groupStandings: allGroupStandings, thirdPlaceResult, userPicks }
        knockoutResolvedMatches = resolveBracket(ctx)
      } catch {
        // Simulation error — render without bracket
      }
    }
  }

  const locked = isPastDeadline()
  const countdown = timeUntilDeadline()

  const deadlineFormatted = PREDICTION_DEADLINE.toLocaleString('en-GB', {
    timeZone: 'Europe/Helsinki',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <Link href="/leaderboard" className="text-gray-500 hover:text-gray-300 text-sm">
          ← Leaderboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          {targetProfile.display_name}
          {isSelf && <span className="ml-2 text-gray-600 text-lg font-normal">(you)</span>}
        </h1>
        {globalRank !== null && (
          <p className="text-gray-400 mt-1 text-sm">
            Global rank: #{globalRank}
          </p>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-6">

        {/* Score breakdown */}
        {breakdown && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-4xl font-bold text-white tabular-nums">{breakdown.total}</span>
              <span className="text-gray-500 text-sm">total points</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <ScoreCard label="Group stage" value={breakdown.groupTotal} />
              <ScoreCard label="Knockout" value={breakdown.knockoutTotal} />
              <ScoreCard label="Top-4 bonus" value={breakdown.topFourBonus} accent />
              <ScoreCard label="Awards" value={breakdown.awardsTotal} />
            </div>
            {/* Awards sub-breakdown */}
            {breakdown.awardsTotal > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {breakdown.awardsBreakdown.boot > 0 && <span>Boot player +{breakdown.awardsBreakdown.boot}</span>}
                {breakdown.awardsBreakdown.bootTally > 0 && <span>Boot goals +{breakdown.awardsBreakdown.bootTally}</span>}
                {breakdown.awardsBreakdown.ball > 0 && <span>Golden Ball +{breakdown.awardsBreakdown.ball}</span>}
                {breakdown.awardsBreakdown.glove > 0 && <span>Golden Glove +{breakdown.awardsBreakdown.glove}</span>}
                {breakdown.awardsBreakdown.young > 0 && <span>Young Player +{breakdown.awardsBreakdown.young}</span>}
              </div>
            )}
            {/* Tiebreakers */}
            <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>Champion {breakdown.tiebreakers.gold ? '✓' : '✗'}</span>
              <span>Runner-up {breakdown.tiebreakers.silver ? '✓' : '✗'}</span>
              <span>3rd place {breakdown.tiebreakers.bronze ? '✓' : '✗'}</span>
              <span>Boot player {breakdown.tiebreakers.goldenBoot ? '✓' : '✗'}</span>
              <span>Group pts {breakdown.tiebreakers.groupPoints}</span>
              <span>R32 correct {breakdown.tiebreakers.r32Correct}</span>
            </div>
          </div>
        )}

        {/* Predictions section */}
        {access.allowed ? (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              {isSelf ? 'Your Predictions' : `${targetProfile.display_name}'s Predictions`}
            </h2>
            <PredictionsSummary
              groupMatchSummaries={groupMatchSummaries}
              knockoutResolvedMatches={knockoutResolvedMatches}
              awardPrediction={awardPrediction}
              completion={completion}
              advancingTeams={advancingTeams}
              isLocked={locked}
              viewOnly={!isSelf}
              subjectName={isSelf ? undefined : targetProfile.display_name}
            />
          </div>
        ) : access.reason === 'pre_deadline' ? (
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h2 className="font-semibold text-white mb-2">Predictions locked until deadline</h2>
            <p className="text-gray-400 text-sm mb-4">
              You can view each other&apos;s predictions once the deadline passes on{' '}
              <span className="text-gray-300">{deadlineFormatted} Helsinki time</span>.
            </p>
            {!locked && countdown.total_ms > 0 && (
              <p className="text-gray-600 text-xs tabular-nums">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m remaining
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-6 text-center">
            <div className="text-3xl mb-3">👥</div>
            <h2 className="font-semibold text-white mb-2">Not in a shared league</h2>
            <p className="text-gray-400 text-sm">
              This user isn&apos;t in any of your leagues. Join the same league to view their predictions.
            </p>
            <Link href="/leagues" className="inline-block mt-4 text-sm text-blue-400 hover:underline">
              Browse leagues →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
