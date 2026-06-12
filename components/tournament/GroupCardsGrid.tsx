'use client'

import { useState } from 'react'
import { TeamBadge } from '@/components/ui/TeamBadge'
import type { GroupData } from '@/lib/tournament/group-data'
import { GroupDetailModal } from './GroupDetailModal'

export function GroupCardsGrid({ groups }: { groups: GroupData[] }) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const openGroup = openGroupId ? groups.find(g => g.groupId === openGroupId) ?? null : null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => {
          const teamById = new Map(g.teams.map(t => [t.id, t]))
          return (
            <button
              key={g.groupId}
              type="button"
              onClick={() => setOpenGroupId(g.groupId)}
              className="text-left rounded-card border border-border-subtle bg-bg-card p-5
                         hover:border-accent/60 hover:bg-bg-card-hover transition-colors
                         focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-accent tracking-wider text-lg">GROUP {g.groupId}</div>
                <span className="text-[11px] text-fg-muted uppercase tracking-wider">
                  {g.results.length}/6 played
                </span>
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
                  {g.standings.map((s, i) => {
                    const t = teamById.get(s.teamId)
                    return (
                      <tr
                        key={s.teamId}
                        className={`border-b border-border-subtle/40 ${i < 2 ? 'text-fg-primary' : 'text-fg-secondary'}`}
                      >
                        <td className="py-1.5">
                          <TeamBadge name={t?.name ?? '—'} abbreviation={t?.code ?? '—'} flag={t?.flag} size="sm" />
                        </td>
                        <td className="text-center px-2 tabular-nums">{s.won}</td>
                        <td className="text-center px-2 tabular-nums">{s.drawn}</td>
                        <td className="text-center px-2 tabular-nums">{s.lost}</td>
                        <td className="text-center px-2 tabular-nums font-bold text-accent">{s.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </button>
          )
        })}
      </div>

      {openGroup && <GroupDetailModal group={openGroup} onClose={() => setOpenGroupId(null)} />}
    </>
  )
}
