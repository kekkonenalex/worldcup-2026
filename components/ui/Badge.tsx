type BadgeVariant = 'hit' | 'miss' | 'pending' | 'result' | 'live'

interface BadgeProps {
  variant: BadgeVariant
  label?: string
  minute?: number
}

const BASE = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs uppercase tracking-wider font-semibold'

const configs: Record<BadgeVariant, { classes: string; icon: string }> = {
  hit:     { classes: 'bg-accent text-accent-fg',                    icon: '●' },
  miss:    { classes: 'bg-status-miss/20 text-status-miss border border-status-miss/30', icon: '✕' },
  pending: { classes: 'bg-status-pending/10 text-status-pending border border-status-pending/20', icon: '⏱' },
  result:  { classes: 'bg-border-subtle text-fg-secondary',           icon: '✓' },
  live:    { classes: 'bg-status-live/20 text-status-live border border-status-live/30 animate-pulse', icon: '●' },
}

export function Badge({ variant, label, minute }: BadgeProps) {
  const { classes, icon } = configs[variant]
  const text =
    variant === 'live'
      ? `Live${minute != null ? ` ${minute}'` : ''}`
      : (label ?? variant)

  return (
    <span className={`${BASE} ${classes}`}>
      <span className="text-[8px] leading-none">{icon}</span>
      {text}
    </span>
  )
}
