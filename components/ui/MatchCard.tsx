import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TeamBadge, type TeamBadgeProps } from '@/components/ui/TeamBadge'
import { MatchTime } from '@/components/ui/MatchTime'
import { ScoreInput } from '@/components/ui/ScoreInput'

type MatchStatus = 'hit' | 'miss' | 'pending' | 'result' | 'live' | 'upcoming'

interface MatchCardProps {
  groupOrStage: string
  homeTeam: TeamBadgeProps | null
  awayTeam: TeamBadgeProps | null
  prediction?: { home: number; away: number } | null
  actual?: { home: number; away: number } | null
  status: MatchStatus
  liveMinute?: number
  pointsEarned?: number | null
  startsInLabel?: string
  kickoffIso?: string | null
  onScoreChange?: (home: number, away: number) => void
  editable?: boolean
  homeSlotLabel?: string
  awaySlotLabel?: string
}

function pts(n: number) {
  return n > 0
    ? <span className="text-xs font-bold text-accent">+{n} PTS</span>
    : <span className="text-xs text-fg-muted">0 PTS</span>
}

export function MatchCard({
  groupOrStage,
  homeTeam,
  awayTeam,
  prediction,
  actual,
  status,
  liveMinute,
  pointsEarned,
  startsInLabel,
  kickoffIso,
  onScoreChange,
  editable,
  homeSlotLabel,
  awaySlotLabel,
}: MatchCardProps) {
  const badgeVariant = status === 'upcoming' ? 'pending' : status

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-fg-muted font-semibold">
            {groupOrStage}
          </span>
          <MatchTime iso={kickoffIso ?? null} className="text-xs text-fg-muted" />
        </div>
        {status !== 'upcoming' && (
          <Badge variant={badgeVariant} minute={liveMinute} />
        )}
        {status === 'upcoming' && startsInLabel && (
          <span className="text-xs text-fg-muted">{startsInLabel}</span>
        )}
      </div>

      {/* Teams + Score row */}
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 flex justify-end">
          {homeTeam
            ? <TeamBadge {...homeTeam} />
            : <span className="text-xs text-fg-muted italic">{homeSlotLabel ?? 'TBD'}</span>
          }
        </div>

        {/* Score */}
        <div className="shrink-0">
          {editable && onScoreChange ? (
            <ScoreInput
              home={prediction?.home ?? null}
              away={prediction?.away ?? null}
              onChange={onScoreChange}
            />
          ) : (
            <ScoreInput
              home={prediction?.home ?? null}
              away={prediction?.away ?? null}
              readOnly
            />
          )}
        </div>

        {/* Away team */}
        <div className="flex-1">
          {awayTeam
            ? <TeamBadge {...awayTeam} />
            : <span className="text-xs text-fg-muted italic">{awaySlotLabel ?? 'TBD'}</span>
          }
        </div>
      </div>

      {/* Footer */}
      {(actual || pointsEarned != null) && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
          {actual ? (
            <span className="text-fg-muted">
              Actual: <span className="text-fg-primary font-semibold">{actual.home}–{actual.away}</span>
            </span>
          ) : <span />}
          {pointsEarned != null && pts(pointsEarned)}
        </div>
      )}
    </Card>
  )
}
