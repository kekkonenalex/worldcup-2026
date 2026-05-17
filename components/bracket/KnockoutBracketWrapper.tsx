'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BracketView } from './BracketView'
import { getDownstreamMatches, type ResolvedMatch } from '@/lib/bracket'
import { PREDICTION_DEADLINE } from '@/lib/config'
import type { TeamStanding } from '@/lib/simulation'
import { saveKnockoutPrediction } from '@/app/predictions/knockout/actions'

interface Props {
  resolvedMatches: ResolvedMatch[]
  advancingTeams: TeamStanding[]
  isLocked: boolean
}

export default function KnockoutBracketWrapper({ resolvedMatches, isLocked }: Props) {
  const router = useRouter()
  const [pendingMatches, setPendingMatches] = useState<Set<number>>(new Set())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [optimisticMatches, applyOptimisticPick] = useOptimistic(
    resolvedMatches,
    (matches, { matchNumber, teamId }: { matchNumber: number; teamId: number }) => {
      const downstream = new Set(getDownstreamMatches(matchNumber))

      const updated = matches.map(m => {
        if (m.match_number === matchNumber) return { ...m, user_pick_team_id: teamId }
        if (downstream.has(m.match_number)) return { ...m, user_pick_team_id: null }
        return m
      })

      // Re-infer 3rd-place teams from the updated SF picks without re-running
      // the full group simulation. team_a/team_b of the SFs are already resolved
      // server-side; we only need to flip loser = the team the user did NOT pick.
      const sf101 = updated.find(m => m.match_number === 101)
      const sf102 = updated.find(m => m.match_number === 102)
      const thirdIdx = updated.findIndex(m => m.match_number === 103)

      if (thirdIdx === -1 || !sf101 || !sf102) return updated

      const loser101 = sf101.user_pick_team_id != null
        ? (sf101.team_a?.team_id === sf101.user_pick_team_id ? sf101.team_b : sf101.team_a)
        : null
      const loser102 = sf102.user_pick_team_id != null
        ? (sf102.team_a?.team_id === sf102.user_pick_team_id ? sf102.team_b : sf102.team_a)
        : null

      const result = [...updated]
      result[thirdIdx] = { ...result[thirdIdx], team_a: loser101, team_b: loser102 }
      return result
    }
  )

  const totalPicks = optimisticMatches.filter(m => m.user_pick_team_id !== null).length
  const allPicked = totalPicks === 32

  const deadlineStr = PREDICTION_DEADLINE.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  })

  const handlePick = (matchNumber: number, teamId: number) => {
    if (isLocked) return
    setErrorMsg(null)

    startTransition(async () => {
      applyOptimisticPick({ matchNumber, teamId })
      setPendingMatches(prev => new Set([...prev, matchNumber]))

      const result = await saveKnockoutPrediction(matchNumber, teamId)

      setPendingMatches(prev => {
        const n = new Set(prev)
        n.delete(matchNumber)
        return n
      })

      if (result.success) {
        router.refresh()
      } else {
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="pb-24">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-bg-base/95 backdrop-blur border-b border-border-subtle py-3 mb-6 flex items-center justify-between gap-4">
        <div className="text-sm font-medium">
          <span className="text-fg-primary tabular-nums">{totalPicks}</span>
          <span className="text-fg-muted"> / 32 picks made</span>
        </div>
        {isLocked ? (
          <div className="flex items-center gap-2 bg-status-live/10 border border-status-live/30 rounded-lg px-3 py-1.5">
            <span className="text-status-live text-xs font-bold uppercase tracking-wide">Locked</span>
            <span className="text-fg-muted text-xs">Tournament has started</span>
          </div>
        ) : (
          <div className="text-xs text-fg-muted">
            Deadline: <span className="text-fg-secondary">{deadlineStr}</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-6 rounded-card bg-status-live/10 border border-status-live/30 px-4 py-3 text-sm text-status-live flex items-start justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-status-live/70 hover:text-status-live shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bracket */}
      <BracketView
        resolvedMatches={optimisticMatches}
        matchProps={(mn) => ({
          mode: 'predict',
          disabled: isLocked || pendingMatches.has(mn),
          onPick: (teamId: number) => handlePick(mn, teamId),
        })}
      />

      {/* Bottom navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 mt-8 border-t border-border-subtle">
        <Link
          href="/predictions/review"
          className="w-full sm:w-auto text-center rounded-lg border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary px-6 py-2.5 font-semibold uppercase tracking-wider text-sm transition-colors"
        >
          ← Standings Review
        </Link>
        {allPicked ? (
          <Link
            href="/predictions/awards"
            className="w-full sm:w-auto text-center rounded-lg bg-accent text-accent-fg hover:bg-accent-hover px-6 py-2.5 font-semibold uppercase tracking-wider text-sm transition-colors"
          >
            Continue to Awards →
          </Link>
        ) : (
          <div className="w-full sm:w-auto text-center rounded-lg bg-bg-elevated text-fg-muted px-6 py-2.5 font-semibold cursor-not-allowed opacity-60 text-sm">
            {32 - totalPicks} / 32 picks still needed
          </div>
        )}
      </div>
    </div>
  )
}
