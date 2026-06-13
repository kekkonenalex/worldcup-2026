'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <button onClick={handleCopy} className="ml-1.5 rounded px-2 py-0.5 text-xs border border-border-subtle hover:border-border-strong transition-colors">
      {copied ? <span className="text-green-400">Copied!</span> : <span className="text-fg-muted">Copy</span>}
    </button>
  )
}

export default function LeagueInviteCard({ inviteCode }: { inviteCode: string }) {
  return (
    <Card className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">Invite code — share to add members</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xl tracking-widest text-fg-primary">{inviteCode}</span>
        <CopyButton text={inviteCode} />
      </div>
    </Card>
  )
}
