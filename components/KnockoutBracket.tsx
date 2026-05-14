'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { STAGE_ORDER, STAGE_LABELS, type ResolvedMatch } from '@/lib/bracket'
import { PREDICTION_DEADLINE } from '@/lib/config'
import type { TeamStanding } from '@/lib/simulation'
import { saveKnockoutPrediction } from '@/app/predictions/knockout/actions'

interface Props {
  resolvedMatches: ResolvedMatch[]
  advancingTeams: TeamStanding[]
  isLocked: boolean
}

// ─── Per-stage match filtering ────────────────────────────────────────────────

function getMatchesForTab(resolvedMatches: ResolvedMatch[], tab: string): ResolvedMatch[] {
  if (tab === 'final_and_third') {
    // Show final first, then third-place
    const final = resolvedMatches.filter(m => m.stage === 'final')
    const third = resolvedMatches.filter(m => m.stage === 'third_place')
    return [...final, ...third]
  }
  return resolvedMatches.filter(m => m.stage === tab)
}

function stageMatchCount(tab: string): number {
  const counts: Record<string, number> = {
    r32: 16, r16: 8, qf: 4, sf: 2, final_and_third: 2,
  }
  return counts[tab] ?? 0
}

// ─── Team button ─────────────────────────────────────────────────────────────

interface TeamButtonProps {
  team: TeamStanding | null
  isPicked: boolean
  isSaved: boolean
  isPending: boolean
  isLocked: boolean
  onClick: () => void
}

function TeamButton({ team, isPicked, isSaved, isPending, isLocked, onClick }: TeamButtonProps) {
  if (!team) {
    return (
      <div className="flex-1 rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-3 text-center opacity-50 cursor-not-allowed">
        <p className="text-xs text-gray-500 leading-tight">TBD</p>
        <p className="text-xs text-gray-600 mt-0.5">complete earlier picks first</p>
      </div>
    )
  }

  const picked = isPicked
  const disabled = isLocked || isPending

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex-1 rounded-lg border px-3 py-3 text-left transition-all',
        picked
          ? 'border-green-500 bg-green-900/25 ring-1 ring-green-500/40'
          : 'border-gray-700 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-800/70',
        disabled && !picked ? 'opacity-60 cursor-not-allowed' : '',
        disabled && picked ? 'cursor-default' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{team.flag_emoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{team.short_code}</span>
            <span className="text-xs text-gray-500 bg-gray-700 px-1 rounded">{team.group_letter}</span>
          </div>
          <div className="text-xs text-gray-400 truncate">{team.team_name}</div>
        </div>
        {picked && (
          <div className="ml-auto shrink-0">
            {isSaved
              ? <span className="text-xs text-green-400 font-medium">Saved ✓</span>
              : <span className="text-xs text-green-500">✓</span>}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Match card ───────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: ResolvedMatch
  isLocked: boolean
  savedMatchNumber: number | null
  pendingMatchNumber: number | null
  onPick: (matchNumber: number, teamId: number) => void
}

function MatchCard({ match, isLocked, savedMatchNumber, pendingMatchNumber, onPick }: MatchCardProps) {
  const isPending = pendingMatchNumber === match.match_number
  const isSavedA = savedMatchNumber === match.match_number && match.user_pick_team_id === match.team_a?.team_id
  const isSavedB = savedMatchNumber === match.match_number && match.user_pick_team_id === match.team_b?.team_id

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/50">
        <span className="text-xs text-gray-400 font-medium">{match.label}</span>
      </div>
      <div className="p-3 flex gap-2">
        <TeamButton
          team={match.team_a}
          isPicked={match.user_pick_team_id === match.team_a?.team_id && match.team_a != null}
          isSaved={isSavedA}
          isPending={isPending}
          isLocked={isLocked}
          onClick={() => match.team_a && onPick(match.match_number, match.team_a.team_id)}
        />
        <div className="flex items-center text-gray-600 text-xs font-bold shrink-0 self-center">
          vs
        </div>
        <TeamButton
          team={match.team_b}
          isPicked={match.user_pick_team_id === match.team_b?.team_id && match.team_b != null}
          isSaved={isSavedB}
          isPending={isPending}
          isLocked={isLocked}
          onClick={() => match.team_b && onPick(match.match_number, match.team_b.team_id)}
        />
      </div>
      {isPending && (
        <div className="px-3 pb-2">
          <div className="h-0.5 bg-blue-600/40 rounded animate-pulse" />
        </div>
      )}
    </div>
  )
}

// ─── Final & 3rd Place tab ────────────────────────────────────────────────────

interface FinalTabProps {
  matches: ResolvedMatch[]
  isLocked: boolean
  savedMatchNumber: number | null
  pendingMatchNumber: number | null
  onPick: (matchNumber: number, teamId: number) => void
}

function FinalAndThirdTab({ matches, isLocked, savedMatchNumber, pendingMatchNumber, onPick }: FinalTabProps) {
  const finalMatch = matches.find(m => m.stage === 'final')
  const thirdMatch = matches.find(m => m.stage === 'third_place')

  return (
    <div className="space-y-6">
      {finalMatch && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400 text-lg">🏆</span>
            <h3 className="font-bold text-white">FINAL — Gold Medal Match</h3>
            <span className="text-xs text-gray-500 ml-1">MetLife Stadium, New Jersey</span>
          </div>
          <MatchCard
            match={finalMatch}
            isLocked={isLocked}
            savedMatchNumber={savedMatchNumber}
            pendingMatchNumber={pendingMatchNumber}
            onPick={onPick}
          />
        </div>
      )}
      {thirdMatch && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-400 text-lg">🥉</span>
            <h3 className="font-bold text-gray-300">THIRD PLACE — Bronze Medal Match</h3>
          </div>
          <p className="text-xs text-gray-500 mb-2 -mt-1">
            The two semi-final losers from your bracket compete for third place.
          </p>
          <MatchCard
            match={thirdMatch}
            isLocked={isLocked}
            savedMatchNumber={savedMatchNumber}
            pendingMatchNumber={pendingMatchNumber}
            onPick={onPick}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KnockoutBracket({ resolvedMatches, isLocked }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<typeof STAGE_ORDER[number]>(STAGE_ORDER[0])
  const [savedMatchNumber, setSavedMatchNumber] = useState<number | null>(null)
  const [pendingMatchNumber, setPendingMatchNumber] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const totalPicks = resolvedMatches.filter(m => m.user_pick_team_id !== null).length
  const allPicked = totalPicks === 32

  const deadlineStr = PREDICTION_DEADLINE.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  })

  const handlePick = (matchNumber: number, teamId: number) => {
    if (pendingMatchNumber !== null || isLocked) return
    setErrorMsg(null)
    setPendingMatchNumber(matchNumber)

    startTransition(async () => {
      const result = await saveKnockoutPrediction(matchNumber, teamId)
      setPendingMatchNumber(null)
      if (result.success) {
        setSavedMatchNumber(matchNumber)
        setTimeout(() => setSavedMatchNumber(prev => prev === matchNumber ? null : prev), 1500)
        router.refresh()
      } else {
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-gray-800 -mx-4 px-4 py-3 mb-6 flex items-center justify-between gap-4">
        <div className="text-sm font-medium">
          <span className="text-white tabular-nums">{totalPicks}</span>
          <span className="text-gray-400"> / 32 picks made</span>
        </div>
        {isLocked
          ? (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-3 py-1.5">
              <span className="text-red-400 text-xs font-bold uppercase tracking-wide">Locked</span>
              <span className="text-gray-500 text-xs">Tournament has started</span>
            </div>
          )
          : (
            <div className="text-xs text-gray-500">
              Deadline: <span className="text-gray-400">{deadlineStr}</span>
            </div>
          )}
      </div>

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300 flex items-start justify-between gap-3">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-300 shrink-0">✕</button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {STAGE_ORDER.map(stage => {
          const tabMatches = getMatchesForTab(resolvedMatches, stage)
          const picked = tabMatches.filter(m => m.user_pick_team_id !== null).length
          const total = stageMatchCount(stage)
          const isActive = activeTab === stage

          return (
            <button
              key={stage}
              onClick={() => setActiveTab(stage)}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              ].join(' ')}
            >
              {STAGE_LABELS[stage]}
              <span className={[
                'text-xs px-1.5 py-0.5 rounded font-mono',
                isActive ? 'bg-blue-700 text-blue-100' : 'bg-gray-700 text-gray-400',
                picked === total ? 'bg-green-800 text-green-300' : '',
              ].filter(Boolean).join(' ')}>
                {picked}/{total}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'final_and_third'
        ? (
          <FinalAndThirdTab
            matches={getMatchesForTab(resolvedMatches, 'final_and_third')}
            isLocked={isLocked}
            savedMatchNumber={savedMatchNumber}
            pendingMatchNumber={pendingMatchNumber}
            onPick={handlePick}
          />
        )
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {getMatchesForTab(resolvedMatches, activeTab).map(match => (
              <MatchCard
                key={match.match_number}
                match={match}
                isLocked={isLocked}
                savedMatchNumber={savedMatchNumber}
                pendingMatchNumber={pendingMatchNumber}
                onPick={handlePick}
              />
            ))}
          </div>
        )}

      {/* ── Bottom navigation ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 mt-8 border-t border-gray-800">
        <Link
          href="/predictions/review"
          className="w-full sm:w-auto text-center rounded-lg border border-gray-600 hover:border-gray-400 px-6 py-2.5 font-medium text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Standings Review
        </Link>

        {allPicked
          ? (
            <Link
              href="/predictions/awards"
              className="w-full sm:w-auto text-center rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-2.5 font-semibold transition-colors"
            >
              Continue to Awards →
            </Link>
          )
          : (
            <div className="w-full sm:w-auto text-center rounded-lg bg-gray-700 px-6 py-2.5 font-semibold cursor-not-allowed opacity-60">
              {32 - totalPicks} / 32 picks still needed
            </div>
          )}
      </div>
    </div>
  )
}
