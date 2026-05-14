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
      className="rounded-lg border border-gray-600 hover:border-gray-400 px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
    >
      Sign out
    </button>
  )
}
