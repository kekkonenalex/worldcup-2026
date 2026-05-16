import { Card } from '@/components/ui/Card'
import { TeamBadge } from '@/components/ui/TeamBadge'

interface TeamRow {
  name: string
  abbreviation: string
  flag?: string
  w: number
  d: number
  l: number
  pts: number
}

interface GroupStandingsTableProps {
  groupLetter: string
  teams: TeamRow[]
  complete: boolean
}

export function GroupStandingsTable({ groupLetter, teams, complete }: GroupStandingsTableProps) {
  const noMatchesPlayed = teams.every(t => t.w + t.d + t.l === 0)
  const displayTeams = noMatchesPlayed
    ? [...teams].sort((a, b) => a.name.localeCompare(b.name))
    : teams

  return (
    <Card>
      <div className="font-display text-accent tracking-wider text-lg mb-3">
        GROUP {groupLetter}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left py-1.5 text-fg-muted font-semibold uppercase tracking-wider">Team</th>
            <th className="text-center px-2 text-fg-muted font-semibold uppercase tracking-wider">W</th>
            <th className="text-center px-2 text-fg-muted font-semibold uppercase tracking-wider">D</th>
            <th className="text-center px-2 text-fg-muted font-semibold uppercase tracking-wider">L</th>
            <th className="text-center px-2 text-accent font-semibold uppercase tracking-wider">PTS</th>
          </tr>
        </thead>
        <tbody>
          {displayTeams.map((t, i) => (
            <tr key={t.name} className={`border-b border-border-subtle/40 ${i < 2 ? 'text-fg-primary' : 'text-fg-secondary'}`}>
              <td className="py-1.5">
                <TeamBadge name={t.name} abbreviation={t.abbreviation} size="sm" />
              </td>
              <td className="text-center px-2 tabular-nums">{t.w}</td>
              <td className="text-center px-2 tabular-nums">{t.d}</td>
              <td className="text-center px-2 tabular-nums">{t.l}</td>
              <td className="text-center px-2 tabular-nums font-bold text-accent">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
