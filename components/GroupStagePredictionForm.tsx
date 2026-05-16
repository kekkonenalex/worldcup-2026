'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { savePrediction } from '@/app/predictions/actions'
import { MAX_GOALS_PER_TEAM, timeUntilDeadline } from '@/lib/config'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { MatchTime } from '@/components/ui/MatchTime'
import type { MatchWithTeams, GroupPrediction } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreEntry = { home_score: number | ''; away_score: number | '' }
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type Countdown = { days: number; hours: number; minutes: number; total_ms: number }

interface Props {
  groupedMatches: Record<string, MatchWithTeams[]>
  existingPredictions: GroupPrediction[]
  isLocked: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseScore(value: string): number | '' {
  if (value === '') return ''
  const n = parseInt(value, 10)
  if (isNaN(n)) return ''
  return Math.min(MAX_GOALS_PER_TEAM, Math.max(0, n))
}

function isComplete(entry: ScoreEntry | undefined): boolean {
  return entry !== undefined &&
    typeof entry.home_score === 'number' &&
    typeof entry.away_score === 'number'
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ status, errorMsg }: { status: SaveStatus; errorMsg?: string }) {
  if (status === 'idle') return <span className="w-5 h-5 inline-block" />
  if (status === 'saving') {
    return (
      <span className="w-5 h-5 inline-flex items-center justify-center">
        <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="w-5 h-5 inline-flex items-center justify-center text-green-400 text-xs font-bold">
        ✓
      </span>
    )
  }
  return (
    <span
      className="w-5 h-5 inline-flex items-center justify-center text-red-400 text-xs font-bold cursor-help"
      title={errorMsg ?? 'Save failed'}
    >
      !
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GroupStagePredictionForm({
  groupedMatches,
  existingPredictions,
  isLocked: initialLocked,
}: Props) {
  const [predictions, setPredictions] = useState<Map<number, ScoreEntry>>(() => {
    const m = new Map<number, ScoreEntry>()
    for (const p of existingPredictions) {
      m.set(p.match_id, {
        home_score: p.predicted_home_score,
        away_score: p.predicted_away_score,
      })
    }
    return m
  })

  const [savingState, setSavingState] = useState<Map<number, SaveStatus>>(new Map())
  const [saveErrors, setSaveErrors] = useState<Map<number, string>>(new Map())
  const [locked, setLocked] = useState(initialLocked)
  const [countdown, setCountdown] = useState<Countdown | null>(null)

  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  // Countdown ticker — client-only to avoid hydration mismatch
  useEffect(() => {
    setCountdown(timeUntilDeadline())
    const interval = setInterval(() => {
      const c = timeUntilDeadline()
      setCountdown(c)
      if (c.total_ms <= 0) {
        setLocked(true)
        clearInterval(interval)
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Clear all timers on unmount
  useEffect(() => {
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, [])

  const sortedGroups = useMemo(() => Object.keys(groupedMatches).sort(), [groupedMatches])

  const predictionCount = useMemo(() => {
    let n = 0
    predictions.forEach(e => { if (isComplete(e)) n++ })
    return n
  }, [predictions])

  // ── Save logic ─────────────────────────────────────────────────────────────

  async function performSave(matchId: number, homeScore: number, awayScore: number) {
    setSavingState(prev => new Map(prev).set(matchId, 'saving'))
    const result = await savePrediction(matchId, homeScore, awayScore)
    if (result.success) {
      setSavingState(prev => new Map(prev).set(matchId, 'saved'))
      setTimeout(() => {
        setSavingState(prev => {
          const next = new Map(prev)
          if (next.get(matchId) === 'saved') next.set(matchId, 'idle')
          return next
        })
      }, 1500)
    } else {
      setSavingState(prev => new Map(prev).set(matchId, 'error'))
      setSaveErrors(prev => new Map(prev).set(matchId, result.error))
    }
  }

  function scheduleAutosave(matchId: number, homeScore: number, awayScore: number) {
    const existing = timers.current.get(matchId)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      performSave(matchId, homeScore, awayScore)
      timers.current.delete(matchId)
    }, 1000)
    timers.current.set(matchId, timer)
  }

  function handleChange(matchId: number, field: 'home_score' | 'away_score', raw: string) {
    if (locked) return
    const val = parseScore(raw)

    // Compute updated entry using current state snapshot (not inside an updater)
    const current = predictions.get(matchId) ?? { home_score: '', away_score: '' }
    const updated: ScoreEntry = { ...current, [field]: val }

    setPredictions(prev => new Map(prev).set(matchId, updated))

    // Only schedule a save once both scores are valid numbers
    if (typeof updated.home_score === 'number' && typeof updated.away_score === 'number') {
      scheduleAutosave(matchId, updated.home_score, updated.away_score)
    }
  }

  function scrollToGroup(letter: string) {
    document.getElementById(`group-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const progressPct = (predictionCount / 72) * 100

  return (
    <div className="pb-16">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 bg-bg-base border-b border-border-subtle py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Counter + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="font-semibold text-fg-primary">{predictionCount}</span>
              <span className="text-fg-muted text-sm">/ 72 predictions made</span>
            </div>
            <div className="h-1.5 bg-bg-elevated rounded-full">
              <div
                className="h-1.5 bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Deadline / locked badge */}
          <div className="shrink-0 text-sm">
            {locked ? (
              <span className="rounded-full bg-status-live/20 border border-status-live/50 px-3 py-1 text-status-live font-semibold text-xs tracking-wide uppercase">
                Predictions locked
              </span>
            ) : countdown ? (
              <span className="text-fg-muted">
                Deadline in{' '}
                <span className="text-fg-primary font-medium">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m
                </span>
              </span>
            ) : (
              <span className="text-fg-muted text-xs">Loading…</span>
            )}
          </div>
        </div>

        {/* ── Group nav tabs ── */}
        <div className="flex gap-1.5 overflow-x-auto mt-3 pb-0.5 scrollbar-none">
          {sortedGroups.map(letter => {
            const groupMatches = groupedMatches[letter]
            const groupComplete = groupMatches.every(m => isComplete(predictions.get(m.id)))
            return (
              <button
                key={letter}
                onClick={() => scrollToGroup(letter)}
                className={`shrink-0 w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                  groupComplete
                    ? 'bg-green-800/60 text-green-300 border border-green-700'
                    : 'bg-bg-elevated text-fg-secondary hover:bg-bg-card-hover border border-border-subtle'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Group sections ── */}
      <div className="mt-6 space-y-8">
        {sortedGroups.map(letter => {
          const groupMatches = groupedMatches[letter]
          const groupComplete = groupMatches.every(m => isComplete(predictions.get(m.id)))
          const teams = [
            ...new Map(
              groupMatches
                .flatMap(m => [m.home_team, m.away_team])
                .filter((t): t is NonNullable<typeof t> => t !== null)
                .map(t => [t.id, t])
            ).values(),
          ]

          return (
            <section
              key={letter}
              id={`group-${letter}`}
              className="scroll-mt-36 rounded-card bg-bg-card border border-border-subtle overflow-hidden"
            >
              {/* Group header */}
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-fg-primary">
                    Group {letter}
                    {groupComplete && (
                      <span className="ml-2 text-green-400 text-base">✓</span>
                    )}
                  </h2>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {teams.map(t => (
                      <TeamBadge key={t.id} name={t.name} abbreviation={t.short_code} size="sm" />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-fg-muted tabular-nums">
                  {groupMatches.filter(m => isComplete(predictions.get(m.id))).length} / 6
                </span>
              </div>

              {/* Match rows */}
              <div>
                {groupMatches.map((match, idx) => {
                  const entry = predictions.get(match.id)
                  const status = savingState.get(match.id) ?? 'idle'
                  const errMsg = saveErrors.get(match.id)
                  const rowBg = idx % 2 === 0 ? 'bg-bg-card' : 'bg-bg-elevated/60'

                  return (
                    <div
                      key={match.id}
                      className={`${rowBg} px-3 py-2 flex flex-col gap-1`}
                    >
                      {/* Kickoff time */}
                      <MatchTime iso={match.scheduled_at ?? null} className="text-xs text-fg-muted" />

                      {/* Match row */}
                      <div className="flex items-center gap-2">
                        {/* Match number */}
                        <span className="text-xs text-fg-muted tabular-nums w-6 shrink-0 text-center">
                          {match.match_number}
                        </span>

                        {/* Home team */}
                        <div className="flex-1 flex items-center justify-end min-w-0">
                          {match.home_team ? (
                            <TeamBadge name={match.home_team.name} abbreviation={match.home_team.short_code} size="sm" />
                          ) : (
                            <span className="text-sm text-fg-muted">TBD</span>
                          )}
                        </div>

                        {/* Score inputs */}
                        <div className="flex items-center gap-1.5 shrink-0 score-pill-field">
                          <input
                            type="number"
                            min={0}
                            max={MAX_GOALS_PER_TEAM}
                            step={1}
                            inputMode="numeric"
                            disabled={locked}
                            value={entry?.home_score ?? ''}
                            onChange={e => handleChange(match.id, 'home_score', e.target.value)}
                            className="score-pill-field w-12 text-center rounded-lg bg-bg-elevated border border-border-subtle text-fg-primary py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-fg-muted text-sm select-none">—</span>
                          <input
                            type="number"
                            min={0}
                            max={MAX_GOALS_PER_TEAM}
                            step={1}
                            inputMode="numeric"
                            disabled={locked}
                            value={entry?.away_score ?? ''}
                            onChange={e => handleChange(match.id, 'away_score', e.target.value)}
                            className="score-pill-field w-12 text-center rounded-lg bg-bg-elevated border border-border-subtle text-fg-primary py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        {/* Away team */}
                        <div className="flex-1 flex items-center min-w-0">
                          {match.away_team ? (
                            <TeamBadge name={match.away_team.name} abbreviation={match.away_team.short_code} size="sm" />
                          ) : (
                            <span className="text-sm text-fg-muted">TBD</span>
                          )}
                        </div>

                        {/* Save indicator */}
                        <div className="shrink-0">
                          <SaveIndicator status={status} errorMsg={errMsg} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* ── Review / continue button ── */}
      <div className="mt-8 pt-6 border-t border-border-subtle text-center">
        {predictionCount === 72 ? (
          <Link
            href="/predictions/review"
            className="inline-block rounded-lg bg-accent text-accent-fg hover:bg-accent-hover px-8 py-3 font-semibold transition-colors"
          >
            Review my standings &amp; continue →
          </Link>
        ) : (
          <button
            disabled
            className="rounded-lg bg-bg-elevated text-fg-muted cursor-not-allowed px-8 py-3 font-semibold"
          >
            Complete all 72 predictions to continue ({predictionCount}/72 done)
          </button>
        )}
      </div>
    </div>
  )
}
