'use client'

import { useState } from 'react'
import type { GroupData } from '@/lib/tournament/group-data'
import { GroupDetailModal } from './GroupDetailModal'

export function GroupCardsGrid({ groups }: { groups: GroupData[] }) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const openGroup = openGroupId ? groups.find(g => g.groupId === openGroupId) ?? null : null

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {groups.map(g => {
          const played = g.results.length
          const leaderId = g.standings[0]?.teamId
          const leader = leaderId ? g.teams.find(t => t.id === leaderId) : null
          const preview = played === 0 ? 'Not started' : leader ? `Leader ${leader.code}` : `${played} of 6`
          return (
            <button
              key={g.groupId}
              type="button"
              onClick={() => setOpenGroupId(g.groupId)}
              className="text-left rounded-card border border-border-subtle bg-bg-card p-4
                         hover:border-accent/60 hover:bg-white/5 transition-colors
                         focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <div className="font-display text-accent tracking-wider text-xl mb-3">GROUP {g.groupId}</div>
              <div className="space-y-1.5 mb-3">
                {g.teams.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-center leading-none">{t.flag}</span>
                    <span className="font-semibold tracking-wider uppercase text-fg-secondary">{t.code}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-fg-muted">
                <span>{preview}</span>
                <span className="tabular-nums">{played}/6</span>
              </div>
            </button>
          )
        })}
      </div>

      {openGroup && <GroupDetailModal group={openGroup} onClose={() => setOpenGroupId(null)} />}
    </>
  )
}
