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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-card bg-bg-card border border-border-strong p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display tracking-wider uppercase text-lg text-fg-primary">{title}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-primary text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <button onClick={handleCopy} title={copied ? 'Copied!' : 'Copy invite code'} className="ml-1 rounded px-1.5 py-0.5 text-xs border border-border-subtle hover:border-border-strong transition-colors">
      {copied ? <span className="text-green-400">Copied!</span> : <span className="text-fg-muted">⧉</span>}
    </button>
  )
}

function CreateLeagueModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string, leagueId: number) => void }) {
  const [name, setName] = useState(''), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (loading) return
    setError(null); setLoading(true)
    const result = await createLeague(name)
    setLoading(false)
    if (result.success && result.leagueId && result.inviteCode) onCreated(result.inviteCode, result.leagueId)
    else setError(result.error ?? 'Something went wrong.')
  }

  return (
    <Modal title="Create a League" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5">League name</label>
          <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office World Cup 2026" maxLength={50} />
          <p className="text-xs text-fg-muted mt-1">{name.trim().length}/50 chars · 3 minimum</p>
        </div>
        {error && <p className="text-sm text-status-live">{error}</p>}
        <button type="submit" disabled={loading || name.trim().length < 3} className="w-full bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm">
          {loading ? 'Creating…' : 'Create'}
        </button>
      </form>
    </Modal>
  )
}

function JoinLeagueModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(''), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (loading) return
    setError(null); setLoading(true)
    const result = await joinLeague(code)
    setLoading(false)
    if (result.leagueId) { onClose(); router.push(`/leagues/${result.leagueId}`) }
    else setError(result.error ?? 'Something went wrong.')
  }

  return (
    <Modal title="Join with Code" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5">Invite code</label>
          <input ref={inputRef} type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase().trim().slice(0, 6))} placeholder="ABC123" className="font-mono tracking-widest uppercase" />
        </div>
        {error && <p className="text-sm text-status-live">{error}</p>}
        <button type="submit" disabled={loading || code.length !== 6} className="w-full bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm">
          {loading ? 'Joining…' : 'Join'}
        </button>
      </form>
    </Modal>
  )
}

export default function LeaguesList({ leagues }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newCodeBanner, setNewCodeBanner] = useState<string | null>(null)

  const handleCreated = (code: string, leagueId: number) => {
    setShowCreate(false); setNewCodeBanner(code); router.refresh(); router.push(`/leagues/${leagueId}`)
  }

  return (
    <div>
      {/* New code banner */}
      {newCodeBanner && (
        <div className="mb-5 rounded-card bg-green-900/20 border border-green-700/50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-green-300 text-sm">League created!</p>
            <p className="text-xs text-fg-muted mt-0.5">
              Share this invite code:
              <span className="font-mono ml-2 text-fg-primary tracking-widest">{newCodeBanner}</span>
              <CopyButton text={newCodeBanner} />
            </p>
          </div>
          <button onClick={() => setNewCodeBanner(null)} className="text-fg-muted hover:text-fg-primary text-lg shrink-0">×</button>
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setShowCreate(true)} className="flex-1 bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-accent-hover transition-colors text-sm">
          + Create League
        </button>
        <button onClick={() => setShowJoin(true)} className="flex-1 border-2 border-dashed border-border-dashed text-fg-primary font-semibold uppercase tracking-wider rounded-lg px-4 py-2.5 hover:bg-bg-card-hover transition-colors text-sm">
          Join with Code
        </button>
      </div>

      {/* League list */}
      {leagues.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fg-secondary text-lg mb-2">You&apos;re not in any leagues yet.</p>
          <p className="text-fg-muted text-sm">Create one or ask a friend for their invite code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {leagues.map(l => (
            <Link key={l.id} href={`/leagues/${l.id}`} className="block rounded-card bg-bg-card border border-border-subtle hover:border-border-strong p-5 transition-colors group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-fg-primary group-hover:text-accent transition-colors leading-tight">{l.name}</h3>
                {l.is_creator && (
                  <span className="shrink-0 text-xs bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                    Creator
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted mb-3">{l.member_count} {l.member_count === 1 ? 'member' : 'members'}</p>
              <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                <span className="text-xs text-fg-muted">Code:</span>
                <span className="font-mono text-xs text-fg-secondary tracking-widest">{l.invite_code}</span>
                <CopyButton text={l.invite_code} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin && <JoinLeagueModal onClose={() => setShowJoin(false)} />}
    </div>
  )
}
