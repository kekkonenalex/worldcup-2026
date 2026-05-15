'use client'

interface ScoreInputProps {
  home: number | null
  away: number | null
  onChange?: (home: number, away: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
}

const PILL = 'bg-bg-elevated border border-border-subtle rounded-md px-3 py-1.5 inline-flex items-center gap-2'
const INPUT = 'score-pill-field w-8 text-center bg-transparent text-fg-primary font-bold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function clamp(v: number) { return Math.min(20, Math.max(0, Math.round(v))) }

export function ScoreInput({ home, away, onChange, readOnly = false, size = 'md' }: ScoreInputProps) {
  const textCls = size === 'sm' ? 'text-sm' : 'text-base'

  function handleHome(raw: string) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && onChange) onChange(clamp(n), away ?? 0)
  }
  function handleAway(raw: string) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && onChange) onChange(home ?? 0, clamp(n))
  }

  if (readOnly) {
    return (
      <div className={PILL}>
        <span className={`${textCls} font-bold text-fg-primary tabular-nums w-5 text-center`}>
          {home ?? '–'}
        </span>
        <span className="text-fg-muted text-xs">–</span>
        <span className={`${textCls} font-bold text-fg-primary tabular-nums w-5 text-center`}>
          {away ?? '–'}
        </span>
      </div>
    )
  }

  return (
    <div className={PILL}>
      <input
        className={`${INPUT} ${textCls}`}
        type="number"
        min={0}
        max={20}
        value={home ?? ''}
        onChange={e => handleHome(e.target.value)}
        placeholder="–"
      />
      <span className="text-fg-muted text-xs">–</span>
      <input
        className={`${INPUT} ${textCls}`}
        type="number"
        min={0}
        max={20}
        value={away ?? ''}
        onChange={e => handleAway(e.target.value)}
        placeholder="–"
      />
    </div>
  )
}
