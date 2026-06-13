'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { leaveLeague, removeMember } from '@/app/leagues/actions'
import type { MemberInfo } from '@/app/leagues/[id]/page'

interface LeagueRow {
  id: number
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

interface Props {
  league: LeagueRow
  members: MemberInfo[]
  currentUserId: string
  isPastDeadline: boolean
}

function CompletionPill({ value, total }: { value: number; total: number }) {
  const complete = value === total
  const partial = value > 0 && !complete
  const cls = complete ? 'text-green-400 bg-green-900/20' : partial ? 'text-accent bg-accent/10' : 'text-fg-muted bg-bg-elevated'
  return (
    <span className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded tabular-nums ${cls}`}>
      {value}/{total}
    </span>
  )
}

function MemberRow({ member, leagueId, currentUserId, isCreator, isOwner, isPastDeadline }: {
  member: MemberInfo; leagueId: number; currentUserId: string; isCreator: boolean; isOwner: boolean; isPastDeadline: boolean
}) {
  const router = useRouter()
  const isMe = member.user_id === currentUserId
  const canRemove = isCreator && !isMe
  const [confirmRemove, setConfirmRemove] = useState(false), [removing, setRemoving] = useState(false), [removeError, setRemoveError] = useState<string | null>(null)

  const handleRemove = async () => {
    setRemoving(true); setRemoveError(null)
    const result = await removeMember(leagueId, member.user_id)
    setRemoving(false)
    if (result.success) router.refresh()
    else { setRemoveError(result.error ?? 'Could not remove member.'); setConfirmRemove(false) }
  }

  return (
    <div className="rounded-card bg-bg-elevated border border-border-subtle px-4 py-3 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-fg-primary truncate">{member.display_name}</span>
            {isOwner && <span className="text-xs bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">Owner</span>}
            {isMe && <span className="text-xs bg-bg-card text-fg-muted border border-border-subtle px-1.5 py-0.5 rounded-full">You</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-fg-muted">Group</span><CompletionPill value={member.group_count} total={72} />
            <span className="text-xs text-fg-muted">KO</span><CompletionPill value={member.knockout_count} total={32} />
            <span className="text-xs text-fg-muted">Awards</span><CompletionPill value={member.awards_count} total={5} />
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isPastDeadline && (
            <Link href={`/leagues/${leagueId}/members/${member.user_id}`} className="rounded-lg border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors">
              View Picks
            </Link>
          )}
          {!isPastDeadline && !canRemove && (
            <span className="text-xs text-fg-muted italic">Visible after deadline</span>
          )}
          {canRemove && !confirmRemove && (
            <button onClick={() => setConfirmRemove(true)} className="rounded px-2 py-1 text-xs text-fg-muted hover:text-status-live hover:bg-status-live/10 transition-colors" title={`Remove ${member.display_name}`}>
              ✕
            </button>
          )}
        </div>
      </div>
      {confirmRemove && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          {removeError && <p className="text-status-live text-xs mb-2">{removeError}</p>}
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">Remove <span className="text-fg-primary font-medium">{member.display_name}</span>?</span>
            <button onClick={() => { setConfirmRemove(false); setRemoveError(null) }} className="text-xs text-fg-muted hover:text-fg-primary transition-colors shrink-0">Cancel</button>
            <button onClick={handleRemove} disabled={removing} className="rounded bg-status-live/80 hover:bg-status-live disabled:opacity-50 px-3 py-1 text-xs font-semibold text-white transition-colors shrink-0">
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeagueDetail({ league, members, currentUserId, isPastDeadline }: Props) {
  const router = useRouter()
  const [confirmLeave, setConfirmLeave] = useState(false), [leaveError, setLeaveError] = useState<string | null>(null), [leaving, setLeaving] = useState(false)
  const isCreator = league.created_by === currentUserId
  const cantLeave = isCreator && members.length <= 1

  const handleLeave = async () => {
    setLeaving(true); setLeaveError(null)
    const result = await leaveLeague(league.id)
    setLeaving(false)
    if (result.success) router.push('/leagues')
    else { setLeaveError(result.error ?? 'Could not leave league.'); setConfirmLeave(false) }
  }

  return (
    <div>
      {/* Members */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(m => (
            <MemberRow key={m.user_id} member={m} leagueId={league.id} currentUserId={currentUserId} isCreator={isCreator} isOwner={m.user_id === league.created_by} isPastDeadline={isPastDeadline} />
          ))}
        </div>
      </div>

      {/* Leave */}
      <div className="border-t border-border-subtle pt-6">
        {leaveError && <div className="mb-3 rounded-lg bg-status-live/10 border border-status-live/30 px-4 py-2.5 text-sm text-status-live">{leaveError}</div>}
        {cantLeave ? (
          <p className="text-sm text-fg-muted">You created this league and are the only member. Invite others before leaving.</p>
        ) : !confirmLeave ? (
          <button onClick={() => setConfirmLeave(true)} className="text-sm text-status-live/70 hover:text-status-live transition-colors">
            Leave this league
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-muted">Are you sure?</span>
            <button onClick={() => setConfirmLeave(false)} className="text-sm text-fg-muted hover:text-fg-primary transition-colors">Cancel</button>
            <button onClick={handleLeave} disabled={leaving} className="rounded-lg bg-status-live/80 hover:bg-status-live disabled:opacity-50 px-4 py-1.5 text-sm font-semibold text-white transition-colors">
              {leaving ? 'Leaving…' : 'Confirm Leave'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
