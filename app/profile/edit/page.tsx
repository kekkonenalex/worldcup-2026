import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChangeUsernameForm from '@/components/profile/ChangeUsernameForm'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import DeleteAccountForm from '@/components/profile/DeleteAccountForm'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .limit(1)

  const profile = (profileRows as unknown as Pick<Profile, 'display_name'>[] | null)?.[0]
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? ''
  const email = user.email ?? ''

  return (
    <div className="pb-16 max-w-lg">
      {/* Back link */}
      <Link
        href="/profile"
        className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
      >
        ← Back to profile
      </Link>

      <div className="mt-3 mb-8">
        <h1 className="text-4xl font-display tracking-wide uppercase text-fg-primary">
          Edit Profile
        </h1>
      </div>

      {/* Section 1 — Username */}
      <section className="rounded-card border border-border-subtle bg-bg-card p-5 mb-5">
        <h2 className="text-lg font-display tracking-wider uppercase text-fg-primary mb-1">
          Username
        </h2>
        <p className="text-fg-muted text-sm mb-5">
          This is how you&apos;ll appear on leaderboards and to other players.
        </p>
        <ChangeUsernameForm currentDisplayName={displayName} />
      </section>

      {/* Section 2 — Password */}
      <section className="rounded-card border border-border-subtle bg-bg-card p-5 mb-5">
        <h2 className="text-lg font-display tracking-wider uppercase text-fg-primary mb-1">
          Password
        </h2>
        <p className="text-fg-muted text-sm mb-5">
          Change the password you use to sign in.
        </p>
        <ChangePasswordForm />
      </section>

      {/* Section 3 — Danger zone */}
      <section className="rounded-card border border-red-800/60 bg-red-950/20 p-5">
        <h2 className="text-lg font-display tracking-wider uppercase text-red-400 mb-2">
          Danger Zone
        </h2>
        <h3 className="font-semibold text-fg-primary mb-2">Delete account</h3>
        <p className="text-fg-muted text-sm mb-5">
          Deleting your account permanently removes your profile, all your predictions, and all your
          league memberships. Leagues you own will be transferred to the longest-tenured member, or
          deleted if no other members exist. <strong className="text-fg-secondary">This action cannot be undone.</strong>
        </p>
        <DeleteAccountForm userEmail={email} />
      </section>
    </div>
  )
}
