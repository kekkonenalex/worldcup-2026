import { Card } from '@/components/ui/Card'

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
  const hasMatches = teams.some(t => t.w + t.d + t.l > 0)

  return (
    <Card>
      <div className="font-display text-accent tracking-wider text-lg mb-3">
        GROUP {groupLetter}
      </div>
      {!complete && !hasMatches ? (
        <p className="text-center text-xs text-fg-muted py-4 uppercase tracking-wider">
          Matches pending
        </p>
      ) : (
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
            {teams.map((t, i) => (
              <tr key={t.name} className={`border-b border-border-subtle/40 ${i < 2 ? 'text-fg-primary' : 'text-fg-secondary'}`}>
                <td className="py-1.5 flex items-center gap-1.5">
                  {t.flag && <span>{t.flag}</span>}
                  <span className="font-semibold uppercase tracking-wider">{t.abbreviation}</span>
                </td>
                <td className="text-center px-2 tabular-nums">{t.w}</td>
                <td className="text-center px-2 tabular-nums">{t.d}</td>
                <td className="text-center px-2 tabular-nums">{t.l}</td>
                <td className="text-center px-2 tabular-nums font-bold text-accent">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
