'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { leaveLeague } from '@/app/leagues/actions'
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

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 rounded px-2 py-0.5 text-xs border border-gray-700 hover:border-gray-500 transition-colors"
    >
      {copied ? <span className="text-green-400">Copied!</span> : <span className="text-gray-400">Copy</span>}
    </button>
  )
}

// ─── Completion pill ──────────────────────────────────────────────────────────

function CompletionPill({ value, total }: { value: number; total: number }) {
  const complete = value === total
  const partial = value > 0 && !complete
  const cls = complete
    ? 'text-green-400 bg-green-900/30'
    : partial
    ? 'text-yellow-400 bg-yellow-900/20'
    : 'text-gray-600 bg-gray-800/40'

  return (
    <span className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded tabular-nums ${cls}`}>
      {value}/{total}
    </span>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  leagueId,
  currentUserId,
  isPastDeadline,
}: {
  member: MemberInfo
  leagueId: number
  currentUserId: string
  isPastDeadline: boolean
}) {
  const isMe = member.user_id === currentUserId

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-white truncate">{member.display_name}</span>
          {isMe && (
            <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded-full shrink-0">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-600">Group</span>
          <CompletionPill value={member.group_count} total={72} />
          <span className="text-xs text-gray-600">KO</span>
          <CompletionPill value={member.knockout_count} total={32} />
          <span className="text-xs text-gray-600">Awards</span>
          <CompletionPill value={member.awards_count} total={5} />
        </div>
      </div>
      <div className="shrink-0">
        {isPastDeadline
          ? (
            <Link
              href={`/leagues/${leagueId}/members/${member.user_id}`}
              className="rounded-lg border border-gray-600 hover:border-gray-400 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors"
            >
              View Predictions
            </Link>
          )
          : (
            <span className="text-xs text-gray-600 italic">Visible after deadline</span>
          )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeagueDetail({ league, members, currentUserId, isPastDeadline }: Props) {
  const router = useRouter()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const isCreator = league.created_by === currentUserId
  const isOnlyMember = members.length <= 1
  const cantLeave = isCreator && isOnlyMember

  const handleLeave = async () => {
    setLeaving(true)
    setLeaveError(null)
    const result = await leaveLeague(league.id)
    setLeaving(false)
    if (result.success) {
      router.push('/leagues')
    } else {
      setLeaveError(result.error ?? 'Could not leave league.')
      setConfirmLeave(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">

      {/* Invite code section */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 mb-6">
        <p className="text-xs text-gray-500 mb-1">Invite code — share this to add members</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl tracking-widest text-white">{league.invite_code}</span>
          <CopyButton text={league.invite_code} />
        </div>
      </div>

      {/* Members section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Members ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map(m => (
            <MemberRow
              key={m.user_id}
              member={m}
              leagueId={league.id}
              currentUserId={currentUserId}
              isPastDeadline={isPastDeadline}
            />
          ))}
        </div>
      </div>

      {/* Leave league */}
      <div className="border-t border-gray-800 pt-6">
        {leaveError && (
          <div className="mb-3 rounded-lg bg-red-900/20 border border-red-800 px-4 py-2.5 text-sm text-red-300">
            {leaveError}
          </div>
        )}

        {cantLeave ? (
          <p className="text-sm text-gray-500">
            You created this league and are the only member. You can&apos;t leave — invite others first.
          </p>
        ) : !confirmLeave ? (
          <button
            onClick={() => setConfirmLeave(true)}
            className="text-sm text-red-500 hover:text-red-400 transition-colors"
          >
            Leave this league
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Are you sure?</span>
            <button
              onClick={() => setConfirmLeave(false)}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 px-4 py-1.5 text-sm font-medium transition-colors"
            >
              {leaving ? 'Leaving…' : 'Confirm Leave'}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
