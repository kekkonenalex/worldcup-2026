'use client'

import { useState } from 'react'
import { AWARD_WINNERS, GOLDEN_BOOT_GOALS_POINTS, type AwardConfig } from '@/lib/awards'
import { saveAwardWinner, saveGoldenBootGoals } from '@/app/admin/actions'

export interface AwardWinnersInitial {
  golden_boot_player: string | null
  golden_boot_goals: number | null
  golden_ball_player: string | null
  golden_glove_player: string | null
  best_young_player: string | null
}

function Row({
  label,
  points,
  children,
  msg,
}: {
  label: string
  points: string
  children: React.ReactNode
  msg: { type: 'ok' | 'err'; text: string } | null
}) {
  return (
    <div className="rounded-card bg-bg-card border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-fg-primary text-sm">{label}</span>
        <span className="text-xs font-mono text-accent">{points}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">{children}</div>
      {msg && (
        <p className={`mt-2 text-xs ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
    </div>
  )
}

const inputCls =
  'flex-1 rounded-lg bg-bg-elevated border border-border-subtle px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent focus:outline-none'
const btnCls =
  'rounded-lg bg-accent text-accent-fg hover:bg-accent-hover font-semibold uppercase tracking-wider text-xs px-4 py-2 transition-colors disabled:opacity-50'

function NameRow({ cfg, initialName }: { cfg: AwardConfig; initialName: string | null }) {
  const [name, setName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    const res = await saveAwardWinner(cfg.key, name)
    setSaving(false)
    if (!res.success) return setMsg({ type: 'err', text: res.error ?? 'Failed to save.' })
    if (name.trim() === '') return setMsg({ type: 'ok', text: 'Winner cleared.' })
    const n = res.matched ?? 0
    setMsg({ type: 'ok', text: `Saved — ${n} ${n === 1 ? 'user' : 'users'} predicted this player.` })
  }

  return (
    <Row label={cfg.label} points={`${cfg.points} pts`} msg={msg}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Player full name"
        className={inputCls}
      />
      <button onClick={save} disabled={saving} className={btnCls}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </Row>
  )
}

function GoalTallyRow({ initialGoals }: { initialGoals: number | null }) {
  const [goals, setGoals] = useState(initialGoals != null ? String(initialGoals) : '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    const trimmed = goals.trim()
    const value = trimmed === '' ? null : Number(trimmed)
    const res = await saveGoldenBootGoals(value)
    setSaving(false)
    if (!res.success) return setMsg({ type: 'err', text: res.error ?? 'Failed to save.' })
    if (value == null) return setMsg({ type: 'ok', text: 'Goal tally cleared.' })
    const n = res.matched ?? 0
    setMsg({ type: 'ok', text: `Saved — ${n} ${n === 1 ? 'user' : 'users'} predicted ${value} goals.` })
  }

  return (
    <Row label="Golden Boot — goal tally" points={`${GOLDEN_BOOT_GOALS_POINTS} pts`} msg={msg}>
      <input
        type="number"
        min={1}
        value={goals}
        onChange={e => setGoals(e.target.value)}
        placeholder="Exact goal count"
        className={`${inputCls} tabular-nums`}
      />
      <button onClick={save} disabled={saving} className={btnCls}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </Row>
  )
}

export default function AdminAwardWinners({ initial }: { initial: AwardWinnersInitial | null }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-display tracking-wide uppercase text-fg-primary mb-1">Award Winners</h2>
      <p className="text-fg-muted text-sm mb-4">
        Enter each award winner&apos;s full name. Every user who predicted that same player (case,
        spacing and accents are ignored) earns the award&apos;s points. The count shown after saving
        is how many users matched — if it&apos;s 0, check the spelling. The Golden Boot player and
        goal tally are scored and saved separately.
      </p>
      <div className="space-y-3">
        {AWARD_WINNERS.map(cfg => (
          <div key={cfg.key} className="space-y-3">
            <NameRow cfg={cfg} initialName={initial ? (initial[cfg.column] as string | null) : null} />
            {cfg.key === 'golden_boot' && <GoalTallyRow initialGoals={initial?.golden_boot_goals ?? null} />}
          </div>
        ))}
      </div>
    </section>
  )
}
