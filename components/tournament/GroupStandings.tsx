import { TeamBadge } from '@/components/ui/TeamBadge'
import type { GroupData } from '@/lib/tournament/group-data'

export function GroupStandings({
  standings,
  teams,
}: {
  standings: GroupData['standings']
  teams: GroupData['teams']
}) {
  const teamById = new Map(teams.map(t => [t.id, t]))

  if (standings.length === 0) {
    return (
      <p className="text-xs text-fg-muted bg-bg-elevated rounded px-3 py-2">
        Standings will appear once the group teams are confirmed.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle text-fg-muted">
            <th className="text-left py-1.5 pr-1 font-semibold">#</th>
            <th className="text-left py-1.5 font-semibold uppercase tracking-wider">Team</th>
            <th className="text-center px-1.5 font-semibold">P</th>
            <th className="text-center px-1.5 font-semibold">W</th>
            <th className="text-center px-1.5 font-semibold">D</th>
            <th className="text-center px-1.5 font-semibold">L</th>
            <th className="text-center px-1.5 font-semibold">GF</th>
            <th className="text-center px-1.5 font-semibold">GA</th>
            <th className="text-center px-1.5 font-semibold">GD</th>
            <th className="text-center pl-1.5 text-accent font-semibold">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const t = teamById.get(s.teamId)
            const accent =
              i < 2
                ? 'border-l-2 border-l-accent'
                : i === 2
                  ? 'border-l-2 border-l-accent/40'
                  : 'border-l-2 border-l-transparent'
            return (
              <tr
                key={s.teamId}
                className={`border-b border-border-subtle/40 ${accent} ${i < 2 ? 'text-fg-primary' : 'text-fg-secondary'}`}
              >
                <td className="py-1.5 pr-1 pl-1.5 tabular-nums text-fg-muted">{i + 1}</td>
                <td className="py-1.5">
                  <TeamBadge name={t?.name ?? '—'} abbreviation={t?.code ?? '—'} flag={t?.flag} size="sm" />
                </td>
                <td className="text-center px-1.5 tabular-nums">{s.played}</td>
                <td className="text-center px-1.5 tabular-nums">{s.won}</td>
                <td className="text-center px-1.5 tabular-nums">{s.drawn}</td>
                <td className="text-center px-1.5 tabular-nums">{s.lost}</td>
                <td className="text-center px-1.5 tabular-nums">{s.goalsFor}</td>
                <td className="text-center px-1.5 tabular-nums">{s.goalsAgainst}</td>
                <td className="text-center px-1.5 tabular-nums">
                  {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                </td>
                <td className="text-center pl-1.5 tabular-nums font-bold text-accent">{s.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
