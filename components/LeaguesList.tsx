'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createLeague, joinLeague } from '@/app/leagues/actions'
import type { LeagueItem } from '@/app/leagues/page'

interface Props {
  leagues: LeagueItem[]
  currentUserId: string
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation() // don't trigger card navigation
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — user can copy from the displayed code
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy invite code'}
      className="ml-1 rounded px-1.5 py-0.5 text-xs transition-colors"
    >
      {copied
        ? <span className="text-green-400 font-medium">Copied!</span>
        : <span className="text-gray-500 hover:text-gray-300">⧉</span>}
    </button>
  )
}

// ─── Create League modal ──────────────────────────────────────────────────────

function CreateLeagueModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (code: string, leagueId: number) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    const result = await createLeague(name)
    setLoading(false)
    if (result.success && result.leagueId && result.inviteCode) {
      onCreated(result.inviteCode, result.leagueId)
    } else {
      setError(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <Modal title="Create a League" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">League name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Office World Cup 2026"
            maxLength={50}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-600 mt-1">{name.trim().length}/50 chars · 3 minimum</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || name.trim().length < 3}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-sm transition-colors"
        >
          {loading ? 'Creating…' : 'Create'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Join League modal ────────────────────────────────────────────────────────

function JoinLeagueModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    const result = await joinLeague(code)
    setLoading(false)
    if (result.success && result.leagueId) {
      onClose()
      router.push(`/leagues/${result.leagueId}`)
    } else if (!result.success && result.leagueId) {
      // Already a member — navigate there anyway
      onClose()
      router.push(`/leagues/${result.leagueId}`)
    } else {
      setError(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <Modal title="Join with Code" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Invite code</label>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().trim().slice(0, 6))}
            placeholder="ABC123"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm font-mono tracking-widest text-white placeholder-gray-600 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-sm transition-colors"
        >
          {loading ? 'Joining…' : 'Join'}
        </button>
      </form>
    </Modal>
  )
}

// ─── League card ──────────────────────────────────────────────────────────────

function LeagueCard({ league }: { league: LeagueItem }) {
  return (
    <Link
      href={`/leagues/${league.id}`}
      className="block rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 p-5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors leading-tight">
          {league.name}
        </h3>
        {league.is_creator && (
          <span className="shrink-0 text-xs bg-blue-900/50 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full font-medium">
            Created by you
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {league.member_count} {league.member_count === 1 ? 'member' : 'members'}
      </p>
      <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
        <span className="text-xs text-gray-600">Code:</span>
        <span className="font-mono text-xs text-gray-400 tracking-widest">{league.invite_code}</span>
        <CopyButton text={league.invite_code} />
      </div>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeaguesList({ leagues }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newCodeBanner, setNewCodeBanner] = useState<string | null>(null)

  const handleCreated = (code: string, leagueId: number) => {
    setShowCreate(false)
    setNewCodeBanner(code)
    router.refresh()
    router.push(`/leagues/${leagueId}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">

      {/* New league code banner */}
      {newCodeBanner && (
        <div className="mb-5 rounded-xl bg-green-900/25 border border-green-700 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-green-300 text-sm">League created!</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Share this invite code with friends:
              <span className="font-mono ml-2 text-white tracking-widest">{newCodeBanner}</span>
              <CopyButton text={newCodeBanner} />
            </p>
          </div>
          <button onClick={() => setNewCodeBanner(null)} className="text-gray-500 hover:text-white text-lg shrink-0">×</button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold text-sm transition-colors"
        >
          + Create League
        </button>
        <button
          onClick={() => setShowJoin(true)}
          className="flex-1 rounded-xl border border-gray-600 hover:border-gray-400 px-4 py-3 font-semibold text-sm text-gray-300 hover:text-white transition-colors"
        >
          Join with Code
        </button>
      </div>

      {/* League grid */}
      {leagues.length === 0
        ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">You&apos;re not in any leagues yet.</p>
            <p className="text-gray-600 text-sm">Create your own or ask a friend for their invite code.</p>
          </div>
        )
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {leagues.map(l => <LeagueCard key={l.id} league={l} />)}
          </div>
        )}

      {/* Modals */}
      {showCreate && (
        <CreateLeagueModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showJoin && (
        <JoinLeagueModal onClose={() => setShowJoin(false)} />
      )}
    </div>
  )
}
