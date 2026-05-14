import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          World Cup 2026 Predictions
        </h1>
        <p className="text-xl text-gray-400 mb-10">
          Pick your matches. Outsmart your friends.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-blue-600 hover:bg-blue-500 px-8 py-3 font-semibold text-lg transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  )
}
