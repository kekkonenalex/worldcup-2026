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
import SignOutButton from '@/components/SignOutButton'
import { Card } from '@/components/ui/Card'
import { TeamBadge } from '@/components/ui/TeamBadge'
import type { MatchWithTeams, GroupPrediction, KnockoutPrediction, AwardPrediction, Profile } from '@/types/database'
import type { GroupMatchSummary, CompletionStatus } from '@/app/predictions/summary/page'
import type { UserScoreBreakdown } from '@/lib/scoring'

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

function ScoreCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-card border px-4 py-3 ${accent ? 'border-accent bg-accent/5' : 'border-border-subtle bg-bg-card'}`}>
      <div className={`text-xs uppercase tracking-wider mb-0.5 ${accent ? 'text-accent' : 'text-fg-muted'}`}>{label}</div>
      <div className="text-xl font-bold text-fg-primary tabular-nums">{value}</div>
      {sub && <div className="text-xs text-fg-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRows } = await supabase
    .from('profiles').select('id, display_name').eq('id', targetUserId).limit(1)

  const targetProfile = (profileRows as unknown as Pick<Profile, 'id' | 'display_name'>[] | null)?.[0]
  if (!targetProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-fg-muted mb-4">User not found.</p>
          <Link href="/leaderboard" className="text-accent hover:underline text-sm">← Leaderboard</Link>
        </div>
      </div>
    )
  }

  const isSelf = user.id === targetUserId
  const [allScores, access] = await Promise.all([
    getAllUserScores(supabase),
    canViewPredictions({ viewerId: user.id, targetUserId, supabase }),
  ])

  const userEntry = allScores.find(s => s.userId === targetUserId)
  const globalRank = userEntry?.rank ?? null
  const breakdown = userEntry?.breakdown as UserScoreBreakdown | undefined

  let groupMatchSummaries: GroupMatchSummary[] = []
  let knockoutResolvedMatches: ResolvedMatch[] = []
  let advancingTeams: TeamStanding[] = []
  let completion: CompletionStatus = { groupComplete: false, knockoutComplete: false, awardsComplete: false, allComplete: false, groupCount: 0, knockoutCount: 0, awardsCount: 0 }
  let awardPrediction: AwardPrediction | null = null

  if (access.allowed) {
    const [{ data: rawMatches }, { data: rawGroupPreds }, { data: rawKoPreds }, { data: awardRows }] = await Promise.all([
      supabase.from('matches').select(`id, match_number, group_letter, home_team_id, away_team_id, scheduled_at, home_team:teams!matches_home_team_id_fkey(id, name, short_code, group_letter, flag_emoji), away_team:teams!matches_away_team_id_fkey(id, name, short_code, group_letter, flag_emoji)`).eq('stage', 'group').order('match_number', { ascending: true }),
      supabase.from('group_predictions').select('*').eq('user_id', targetUserId),
      supabase.from('knockout_predictions').select('*').eq('user_id', targetUserId),
      supabase.from('award_predictions').select('*').eq('user_id', targetUserId).limit(1),
    ])

    const matches = (rawMatches ?? []) as unknown as MatchWithTeams[]
    const groupPreds = (rawGroupPreds ?? []) as unknown as GroupPrediction[]
    const koPreds = (rawKoPreds ?? []) as unknown as KnockoutPrediction[]
    awardPrediction = (awardRows?.[0] ?? null) as AwardPrediction | null

    const groupCount = groupPreds.length, knockoutCount = koPreds.length, awardsCount = countAwards(awardPrediction)
    const groupComplete = groupCount === 72, knockoutComplete = knockoutCount === 32, awardsComplete = awardsCount === 5
    completion = { groupComplete, knockoutComplete, awardsComplete, allComplete: groupComplete && knockoutComplete && awardsComplete, groupCount, knockoutCount, awardsCount }

    const predMap = new Map<number, GroupPrediction>()
    for (const p of groupPreds) predMap.set(p.match_id, p)

    groupMatchSummaries = matches.map(m => {
      const pred = predMap.get(m.id)
      return { match_number: m.match_number, group_letter: m.group_letter ?? '', home_name: m.home_team?.name ?? '', home_flag: m.home_team?.flag_emoji ?? '', home_code: m.home_team?.short_code ?? '', away_name: m.away_team?.name ?? '', away_flag: m.away_team?.flag_emoji ?? '', away_code: m.away_team?.short_code ?? '', home_score: pred?.predicted_home_score ?? null, away_score: pred?.predicted_away_score ?? null, scheduled_at: m.scheduled_at ?? null }
    })

    if (groupComplete) {
      const matchesByGroup = new Map<string, MatchInput[]>(), teamsByGroup = new Map<string, Map<number, TeamInput>>()
      for (const raw of matches) {
        const letter = raw.group_letter; if (!letter) continue
        if (!matchesByGroup.has(letter)) { matchesByGroup.set(letter, []); teamsByGroup.set(letter, new Map()) }
        matchesByGroup.get(letter)!.push({ id: raw.id, match_number: raw.match_number, group_letter: letter, home_team_id: raw.home_team_id!, away_team_id: raw.away_team_id! })
        const tMap = teamsByGroup.get(letter)!
        if (raw.home_team && !tMap.has(raw.home_team.id)) tMap.set(raw.home_team.id, { ...raw.home_team, group_letter: letter })
        if (raw.away_team && !tMap.has(raw.away_team.id)) tMap.set(raw.away_team.id, { ...raw.away_team, group_letter: letter })
      }
      const predictions: PredictionInput[] = groupPreds.map(p => ({ match_id: p.match_id, predicted_home_score: p.predicted_home_score, predicted_away_score: p.predicted_away_score }))
      try {
        const allGroupStandings = GROUP_LETTERS.map(letter => { const gm = matchesByGroup.get(letter) ?? [], gt = Array.from(teamsByGroup.get(letter)?.values() ?? []); return computeGroupStandings(letter, gm, predictions, gt) }).filter(s => s.length > 0)
        const thirdPlaceResult = rankThirdPlaceTeams(allGroupStandings)
        advancingTeams = getAdvancingTeams(allGroupStandings, thirdPlaceResult)
        const userPicks = new Map<number, number>()
        for (const p of koPreds) userPicks.set(p.bracket_position, p.predicted_team_id)
        const ctx: BracketContext = { groupStandings: allGroupStandings, thirdPlaceResult, userPicks }
        knockoutResolvedMatches = resolveBracket(ctx)
      } catch { /* simulation error */ }
    }
  }

  const locked = isPastDeadline()
  const countdown = timeUntilDeadline()
  const deadlineFormatted = PREDICTION_DEADLINE.toLocaleString('en-GB', { timeZone: 'Europe/Helsinki', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Champion/runner-up derive from the user's bracket pick for match 104 (the final),
  // not from slot order. team_a was previously used as champion regardless of the pick.
  const finalMatch = knockoutResolvedMatches.find(m => m.match_number === 104)
  const pickedId = finalMatch?.user_pick_team_id ?? null
  const predictedChampion = pickedId !== null
    ? (finalMatch?.team_a?.team_id === pickedId ? finalMatch.team_a : finalMatch?.team_b?.team_id === pickedId ? finalMatch.team_b : null)
    : null
  const predictedRunnerUp = pickedId !== null && finalMatch
    ? (finalMatch.team_a?.team_id === pickedId ? finalMatch.team_b : finalMatch.team_a)
    : null

  return (
    <div className="pb-16 max-w-3xl">
      {/* Back */}
      <Link href="/leaderboard" className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors">
        ← Leaderboard
      </Link>

      {/* Heading */}
      <div className="mt-3 mb-6">
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary">
          {isSelf ? 'My Profile' : `${targetProfile.display_name}'s Profile`}
          {isSelf && <span className="ml-3 text-fg-muted text-2xl font-normal">(you)</span>}
        </h1>
        {globalRank !== null && (
          <p className="text-fg-muted text-sm mt-1">Global rank: <span className="text-fg-primary font-semibold">#{globalRank}</span></p>
        )}
      </div>

      {/* Score breakdown */}
      {breakdown && (
        <div className="rounded-card bg-bg-card border border-border-subtle p-5 mb-6">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-4xl font-bold text-fg-primary tabular-nums">{breakdown.total}</span>
            <span className="text-fg-muted text-sm">total points</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ScoreCard label="Group stage" value={breakdown.groupTotal} />
            <ScoreCard label="Knockout" value={breakdown.knockoutTotal} />
            <ScoreCard label="Top-4 bonus" value={breakdown.topFourBonus} accent />
            <ScoreCard label="Awards" value={breakdown.awardsTotal} />
          </div>
          {breakdown.awardsTotal > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
              {breakdown.awardsBreakdown.boot > 0 && <span>Boot player +{breakdown.awardsBreakdown.boot}</span>}
              {breakdown.awardsBreakdown.bootTally > 0 && <span>Boot goals +{breakdown.awardsBreakdown.bootTally}</span>}
              {breakdown.awardsBreakdown.ball > 0 && <span>Golden Ball +{breakdown.awardsBreakdown.ball}</span>}
              {breakdown.awardsBreakdown.glove > 0 && <span>Golden Glove +{breakdown.awardsBreakdown.glove}</span>}
              {breakdown.awardsBreakdown.young > 0 && <span>Young Player +{breakdown.awardsBreakdown.young}</span>}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border-subtle flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
            <span>Champion {breakdown.tiebreakers.gold ? '✓' : '✗'}</span>
            <span>Runner-up {breakdown.tiebreakers.silver ? '✓' : '✗'}</span>
            <span>3rd place {breakdown.tiebreakers.bronze ? '✓' : '✗'}</span>
            <span>Boot player {breakdown.tiebreakers.goldenBoot ? '✓' : '✗'}</span>
            <span>Group pts {breakdown.tiebreakers.groupPoints}</span>
            <span>R32 correct {breakdown.tiebreakers.r32Correct}</span>
          </div>
        </div>
      )}

      {/* Knockout picks highlight */}
      {access.allowed && knockoutResolvedMatches.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card variant="highlighted" className="col-span-2">
            <div className="text-xs uppercase tracking-wider text-accent mb-2">Predicted Champion</div>
            {predictedChampion ? (
              <div className="flex items-center gap-3">
                <TeamBadge name={predictedChampion.team_name} abbreviation={predictedChampion.short_code} size="lg" />
                <div className="text-xs text-fg-muted">🏆 Locked in</div>
              </div>
            ) : (
              <p className="text-fg-muted text-sm">Complete your knockout bracket to reveal.</p>
            )}
          </Card>
          <div className="flex flex-col gap-3">
            <Card>
              <div className="text-xs uppercase tracking-wider text-fg-muted mb-1">Runner-Up</div>
              <div className="text-sm font-semibold text-fg-primary">
                {predictedRunnerUp
                  ? <TeamBadge name={predictedRunnerUp.team_name} abbreviation={predictedRunnerUp.short_code} size="sm" />
                  : '—'}
              </div>
            </Card>
            <Card>
              <div className="text-xs uppercase tracking-wider text-fg-muted mb-1">Golden Boot</div>
              <div className="text-sm font-semibold text-fg-primary truncate">
                {awardPrediction?.golden_boot_player || '—'}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Predictions section */}
      {access.allowed ? (
        <div>
          <h2 className="text-2xl font-display tracking-wider uppercase text-fg-primary mb-3">
            {isSelf ? 'Your Predictions' : 'Predictions'}
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
        <Card className="text-center py-6">
          <div className="text-3xl mb-3">🔒</div>
          <h2 className="font-semibold text-fg-primary mb-2">Predictions locked until deadline</h2>
          <p className="text-fg-muted text-sm mb-4">
            Visible to all once the deadline passes on{' '}
            <span className="text-fg-secondary">{deadlineFormatted} Helsinki time</span>.
          </p>
          {!locked && countdown.total_ms > 0 && (
            <p className="text-fg-muted text-xs tabular-nums">
              {countdown.days}d {countdown.hours}h {countdown.minutes}m remaining
            </p>
          )}
        </Card>
      ) : (
        <Card className="text-center py-6">
          <div className="text-3xl mb-3">👥</div>
          <h2 className="font-semibold text-fg-primary mb-2">Not in a shared league</h2>
          <p className="text-fg-muted text-sm mb-4">
            Join the same league to view their predictions.
          </p>
          <Link href="/leagues" className="text-sm text-accent hover:underline">Browse leagues →</Link>
        </Card>
      )}

      {isSelf && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-8">
          <Link
            href="/profile/edit"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg text-sm hover:bg-accent-hover transition-colors"
          >
            Edit Profile
          </Link>
          <SignOutButton />
        </div>
      )}
    </div>
  )
}
