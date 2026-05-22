import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .limit(1)

  const profile = (profileRows as unknown as Pick<Profile, 'display_name'>[] | null)?.[0]
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Unknown'

  return (
    <div className="pb-16 max-w-lg">
      <div className="mb-8">
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary mb-1">
          My Profile
        </h1>
        <p className="text-fg-muted text-sm">Manage your account settings.</p>
      </div>

      <div className="rounded-card border border-border-subtle bg-bg-card p-5 mb-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">Username</p>
          <p className="text-fg-primary font-medium">{displayName}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1">Email</p>
          <p className="text-fg-secondary text-sm">{user.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/profile/edit"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-accent text-accent-fg font-semibold uppercase tracking-wider rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          Edit Profile
        </Link>
        <SignOutButton />
      </div>
    </div>
  )
}
