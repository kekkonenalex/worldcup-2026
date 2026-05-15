import Link from 'next/link'

interface LeaderboardRowProps {
  rank: number
  isCurrentUser: boolean
  displayName: string
  avatarInitials: string
  points: number
  lastPickLabel?: string
  trend?: 'up' | 'down' | 'flat'
  action: { label: string; href: string }
}

function TrendArrow({ trend }: { trend?: 'up' | 'down' | 'flat' }) {
  if (!trend || trend === 'flat') return <span className="text-fg-muted text-xs">—</span>
  return trend === 'up'
    ? <span className="text-green-400 text-xs">▲</span>
    : <span className="text-status-live text-xs">▼</span>
}

export function LeaderboardRow({
  rank,
  isCurrentUser,
  displayName,
  avatarInitials,
  points,
  lastPickLabel,
  trend,
  action,
}: LeaderboardRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        isCurrentUser
          ? 'bg-bg-elevated border-border-strong border-l-2 border-l-accent pl-3'
          : 'bg-bg-card border-border-subtle hover:border-border-strong'
      }`}
    >
      {/* Rank */}
      <span
        className={`w-8 text-center shrink-0 text-sm font-bold tabular-nums ${
          rank === 1 ? 'text-accent' : 'text-fg-muted'
        }`}
      >
        {rank === 1 ? '🏆' : `#${rank}`}
      </span>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-fg-secondary uppercase">{avatarInitials}</span>
      </div>

      {/* Name + last pick */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-fg-primary' : 'text-fg-primary'}`}>
          {displayName}
          {isCurrentUser && <span className="ml-1.5 text-xs text-fg-muted font-normal">(you)</span>}
        </p>
        {lastPickLabel && (
          <p className="text-xs text-fg-muted truncate uppercase tracking-wider">{lastPickLabel}</p>
        )}
      </div>

      {/* Points + trend */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${points > 0 ? 'text-fg-primary' : 'text-fg-muted'}`}>
          {points} <span className="text-xs font-normal text-fg-muted">pts</span>
        </p>
        <TrendArrow trend={trend} />
      </div>

      {/* Action */}
      <Link
        href={action.href}
        className={`shrink-0 text-xs font-semibold uppercase tracking-wider rounded-lg px-3 py-1.5 border transition-colors ${
          isCurrentUser
            ? 'bg-accent text-accent-fg hover:bg-accent-hover border-accent'
            : 'border-dashed border-border-dashed text-fg-muted hover:text-fg-primary hover:border-border-strong'
        }`}
      >
        {action.label}
      </Link>
    </div>
  )
}
