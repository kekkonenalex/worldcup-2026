'use client'

import { useEffect, useRef } from 'react'
import type { GroupData } from '@/lib/tournament/group-data'
import { GroupStandings } from './GroupStandings'
import { MatchRow } from './MatchRow'

export function GroupDetailModal({
  group,
  onClose,
}: {
  group: GroupData
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  // Clicking the dialog element itself (i.e. the backdrop area) closes it;
  // clicks land on child content otherwise.
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleClick}
      className="m-0 h-full max-h-none w-full max-w-none bg-bg-card text-fg-primary p-0
                 sm:m-auto sm:h-auto sm:max-h-[90vh] sm:w-[min(42rem,100%)] sm:max-w-2xl
                 sm:rounded-card border border-border-subtle overflow-hidden"
    >
      <div className="flex flex-col h-full max-h-[100dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <h2 className="font-display text-accent tracking-wider text-2xl">GROUP {group.groupId}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-md text-fg-muted hover:text-fg-primary hover:bg-white/10 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto px-5 py-5 space-y-6"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <GroupStandings standings={group.standings} teams={group.teams} />

          <section>
            <h3 className="font-display tracking-wider text-fg-primary text-sm uppercase mb-3">Results</h3>
            {group.results.length === 0 ? (
              <p className="text-xs text-fg-muted bg-bg-elevated rounded px-3 py-2">No matches played yet.</p>
            ) : (
              <div className="space-y-2">
                {group.results.map(m => (
                  <MatchRow key={m.matchId} kind="finished" match={m} teams={group.teams} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="font-display tracking-wider text-fg-primary text-sm uppercase mb-3">Upcoming</h3>
            {group.upcoming.length === 0 ? (
              <p className="text-xs text-fg-muted bg-bg-elevated rounded px-3 py-2">All matches played.</p>
            ) : (
              <div className="space-y-2">
                {group.upcoming.map(m => (
                  <MatchRow key={m.matchId} kind="upcoming" match={m} teams={group.teams} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </dialog>
  )
}
