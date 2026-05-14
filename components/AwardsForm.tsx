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
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-bold text-white">{title}</h3>
        <span className="text-xs text-yellow-500 font-medium">{points}</span>
      </div>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">{subtitle}</p>
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
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type="text"
        maxLength={80}
        value={value}
        placeholder={placeholder ?? 'Player name...'}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={[
          'w-full rounded-lg border px-3 py-2.5 text-sm bg-gray-800 text-white placeholder-gray-600',
          'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          'border-gray-700 transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600',
        ].join(' ')}
      />
    </div>
  )
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<SaveStatus, { cls: string; text: string }> = {
    idle: { cls: '', text: '' },
    saving: { cls: 'text-blue-400', text: 'Saving…' },
    saved: { cls: 'text-green-400', text: '✓ Saved' },
    error: { cls: 'text-red-400', text: '⚠ Save failed' },
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
        <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 flex items-center gap-2">
          <span className="text-red-400 font-bold text-xs uppercase tracking-wide">Predictions Locked</span>
          <span className="text-gray-400 text-sm">The tournament has started — no further changes allowed.</span>
        </div>
      )}

      {/* Status bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          <span className="text-white font-semibold tabular-nums">{completedCount}</span> / 5 awards predicted
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 px-4 py-2.5 text-sm text-red-300">
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
              <label className="block text-xs text-gray-400 mb-1.5">
                Predicted goal count
                <span className="ml-2 text-gray-500 font-normal">
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
                className={[
                  'w-32 rounded-lg border px-3 py-2.5 text-sm bg-gray-800 text-white placeholder-gray-600',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
                  'border-gray-700 transition-colors',
                  isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600',
                ].join(' ')}
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
      <div className="fixed bottom-0 inset-x-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/predictions/knockout"
            className="rounded-lg border border-gray-600 hover:border-gray-400 px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            ← Back to Knockout Bracket
          </Link>
          <Link
            href="/predictions/summary"
            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            View My Predictions Summary →
          </Link>
        </div>
      </div>

    </div>
  )
}
