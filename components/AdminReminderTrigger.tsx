'use client'

import { useState } from 'react'

type ReminderResult = {
  sent?: number
  skipped_complete?: number
  errors?: Array<{ email: string; error: string }>
  skipped?: boolean
  reason?: string
  error?: string
}

export default function AdminReminderTrigger() {
  const [result, setResult] = useState<ReminderResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/trigger-reminder', { method: 'POST' })
      const data = (await res.json()) as ReminderResult
      setResult(data)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-12 rounded-card border border-border-subtle bg-bg-card p-6">
      <h2 className="font-display tracking-wide uppercase text-fg-primary text-2xl mb-1">
        Send Reminder Emails
      </h2>
      <p className="text-fg-muted text-sm mb-1">
        Sends a deadline reminder to every user who has not completed all three prediction sections
        (group stage, knockout bracket, awards).
      </p>
      <p className="text-xs text-fg-muted mb-5">
        Note: only sends within the June 9, 2026 send window (07:00–13:00 UTC).
        Outside that window the request returns <code className="font-mono">skipped: true</code>.
      </p>
      <button
        onClick={handleSend}
        disabled={loading}
        className="px-4 py-2 bg-accent text-white rounded font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Sending…' : 'Send Deadline Reminder Now'}
      </button>
      {result && (
        <pre className="mt-4 text-xs bg-bg-elevated rounded p-3 overflow-x-auto text-fg-secondary whitespace-pre-wrap break-words">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
