'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { saveAwards } from '@/app/predictions/awards/actions'
import type { AwardPrediction } from '@/types/database'

interface Props {
  initial: AwardPrediction | null
  isLocked: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type Fields = {
  goldenBootPlayer: string
  goldenBootGoals: string
  goldenBallPlayer: string
  goldenGlovePlayer: string
  bestYoungPlayer: string
}

// ─── Award card ───────────────────────────────────────────────────────────────

interface AwardCardProps {
  title: string
  points: string
  subtitle: string
  children: React.ReactNode
}

function AwardCard({ title, points, subtitle, children }: AwardCardProps) {
  return (
    <div className="rounded-card bg-bg-card border border-border-subtle p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-bold text-fg-primary">{title}</h3>
        <span className="text-xs text-accent font-medium">{points}</span>
      </div>
      <p className="text-xs text-fg-muted mb-4 leading-relaxed">{subtitle}</p>
      {children}
    </div>
  )
}

// ─── Text input ───────────────────────────────────────────────────────────────

interface TextFieldProps {
  label: string
  value: string
  placeholder?: string
  disabled: boolean
  onChange: (val: string) => void
}

function TextField({ label, value, placeholder, disabled, onChange }: TextFieldProps) {
  return (
    <div>
      <label className="block text-xs text-fg-muted mb-1.5">{label}</label>
      <input
        type="text"
        maxLength={80}
        value={value}
        placeholder={placeholder ?? 'Player name...'}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
      />
    </div>
  )
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<SaveStatus, { cls: string; text: string }> = {
    idle: { cls: '', text: '' },
    saving: { cls: 'text-fg-muted', text: 'Saving…' },
    saved: { cls: 'text-green-400', text: '✓ Saved' },
    error: { cls: 'text-status-live', text: '⚠ Save failed' },
  }
  const { cls, text } = map[status]
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AwardsForm({ initial, isLocked }: Props) {
  const [fields, setFields] = useState<Fields>({
    goldenBootPlayer: initial?.golden_boot_player ?? '',
    goldenBootGoals: initial?.golden_boot_goals?.toString() ?? '',
    goldenBallPlayer: initial?.golden_ball_player ?? '',
    goldenGlovePlayer: initial?.golden_glove_player ?? '',
    bestYoungPlayer: initial?.best_young_player ?? '',
  })

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  const completedCount = [
    fields.goldenBootPlayer.trim(),
    fields.goldenBootGoals,
    fields.goldenBallPlayer.trim(),
    fields.goldenGlovePlayer.trim(),
    fields.bestYoungPlayer.trim(),
  ].filter(v => v !== '').length

  const triggerSave = useCallback((f: Fields) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      setErrorMsg(null)
      const goals = f.goldenBootGoals === '' ? null : parseInt(f.goldenBootGoals, 10)
      const result = await saveAwards({
        goldenBootPlayer: f.goldenBootPlayer,
        goldenBootGoals: isNaN(goals as number) ? null : goals,
        goldenBallPlayer: f.goldenBallPlayer,
        goldenGlovePlayer: f.goldenGlovePlayer,
        bestYoungPlayer: f.bestYoungPlayer,
      })
      if (result.success) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setErrorMsg(result.error)
      }
    }, 1000)
  }, [])

  useEffect(() => {
    // Skip the initial render — don't auto-save on mount
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!isLocked) triggerSave(fields)
  }, [fields, isLocked, triggerSave])

  const update = (key: keyof Fields) => (val: string) =>
    setFields(prev => ({ ...prev, [key]: val }))

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32">

      {/* Locked banner */}
      {isLocked && (
        <div className="mb-6 rounded-card bg-status-live/10 border border-status-live/30 px-4 py-3 flex items-center gap-2">
          <span className="text-status-live font-bold text-xs uppercase tracking-wide">Predictions Locked</span>
          <span className="text-fg-muted text-sm">The tournament has started — no further changes allowed.</span>
        </div>
      )}

      {/* Status bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-fg-muted">
          <span className="text-fg-primary font-semibold tabular-nums">{completedCount}</span> / 5 awards predicted
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mb-4 rounded-card bg-status-live/10 border border-status-live/30 px-4 py-2.5 text-sm text-status-live">
          {errorMsg}
        </div>
      )}

      <div className="space-y-4">

        {/* Golden Boot */}
        <AwardCard
          title="Golden Boot (Top Goalscorer)"
          points="20 pts + 10 pts for correct goal count"
          subtitle="The player who scores the most goals in the tournament. If two players tie, predicting either one earns the points."
        >
          <div className="space-y-3">
            <TextField
              label="Player name"
              value={fields.goldenBootPlayer}
              disabled={isLocked}
              onChange={update('goldenBootPlayer')}
            />
            <div>
              <label className="block text-xs text-fg-muted mb-1.5">
                Predicted goal count
                <span className="ml-2 font-normal">
                  — worth 10 separate bonus points if correct (independent of the player pick)
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={fields.goldenBootGoals}
                disabled={isLocked}
                onChange={e => {
                  const v = e.target.value
                  if (v === '' || (/^\d+$/.test(v) && parseInt(v, 10) >= 1 && parseInt(v, 10) <= 20)) {
                    update('goldenBootGoals')(v)
                  }
                }}
                placeholder="e.g. 8"
                className={`!w-32 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
        </AwardCard>

        {/* Golden Ball */}
        <AwardCard
          title="Golden Ball (Best Player)"
          points="20 pts"
          subtitle="The most outstanding player of the tournament, voted by media representatives."
        >
          <TextField
            label="Player name"
            value={fields.goldenBallPlayer}
            disabled={isLocked}
            onChange={update('goldenBallPlayer')}
          />
        </AwardCard>

        {/* Golden Glove */}
        <AwardCard
          title="Golden Glove (Best Goalkeeper)"
          points="20 pts"
          subtitle="The best goalkeeper of the tournament."
        >
          <TextField
            label="Player name"
            value={fields.goldenGlovePlayer}
            disabled={isLocked}
            onChange={update('goldenGlovePlayer')}
          />
        </AwardCard>

        {/* Best Young Player */}
        <AwardCard
          title="Best Young Player"
          points="15 pts"
          subtitle="The best player born on or after 1 January 2005."
        >
          <TextField
            label="Player name"
            value={fields.bestYoungPlayer}
            disabled={isLocked}
            onChange={update('bestYoungPlayer')}
          />
        </AwardCard>

      </div>

      {/* Sticky bottom nav */}
      <div className="fixed bottom-0 inset-x-0 bg-bg-base/95 backdrop-blur border-t border-border-subtle px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/predictions/knockout"
            className="rounded-lg border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors"
          >
            ← Knockout Bracket
          </Link>
          <Link
            href="/predictions/summary"
            className="rounded-lg bg-accent text-accent-fg hover:bg-accent-hover px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors"
          >
            Predictions Summary →
          </Link>
        </div>
      </div>

    </div>
  )
}
