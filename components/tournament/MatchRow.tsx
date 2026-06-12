import { TeamBadge } from '@/components/ui/TeamBadge'
import type { GroupData } from '@/lib/tournament/group-data'

type MatchRowProps =
  | { kind: 'finished'; match: GroupData['results'][number]; teams: GroupData['teams'] }
  | { kind: 'upcoming'; match: GroupData['upcoming'][number]; teams: GroupData['teams'] }

const kickoffFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Helsinki',
})

function formatKickoff(iso: string | null): string {
  if (!iso) return 'TBD'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? 'TBD' : kickoffFmt.format(d)
}

export function MatchRow(props: MatchRowProps) {
  const { match, teams } = props
  const teamById = new Map(teams.map(t => [t.id, t]))
  const home = teamById.get(match.home.teamId)
  const away = teamById.get(match.away.teamId)

  const pred = match.userPrediction
  const predText = pred ? `Your pick: ${pred.home}–${pred.away}` : '—'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-md bg-white/5 border border-border-subtle/60 px-3 py-2.5">
      {/* Kickoff */}
      <div className="text-[11px] text-fg-muted tabular-nums shrink-0 sm:w-28">
        {formatKickoff(match.kickoffUtc)}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 flex justify-end">
          <TeamBadge name={home?.name ?? '—'} abbreviation={home?.code ?? '—'} flag={home?.flag} size="sm" />
        </div>
        <div className="shrink-0 font-display tracking-wider text-fg-primary text-sm tabular-nums px-1">
          {props.kind === 'finished'
            ? `${props.match.home.score} – ${props.match.away.score}`
            : 'vs'}
        </div>
        <div className="flex-1 flex justify-start">
          <TeamBadge name={away?.name ?? '—'} abbreviation={away?.code ?? '—'} flag={away?.flag} size="sm" />
        </div>
      </div>

      {/* Prediction + points */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:w-40">
        <span className={`text-[11px] ${pred ? 'text-fg-secondary' : 'text-fg-muted'}`}>{predText}</span>
        {props.kind === 'finished' && props.match.userPoints != null && (
          <span
            className={`text-[11px] font-bold tabular-nums ${
              props.match.userPoints > 0 ? 'text-accent' : 'text-fg-muted'
            }`}
          >
            {props.match.userPoints > 0 ? `+${props.match.userPoints}` : '0'} pts
          </span>
        )}
      </div>
    </div>
  )
}
