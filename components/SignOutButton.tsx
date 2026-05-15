'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="border-2 border-dashed border-border-dashed text-fg-muted hover:text-fg-primary font-semibold uppercase tracking-wider rounded-lg px-4 py-2 text-sm transition-colors"
    >
      Sign Out
    </button>
  )
}
