import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountSetupForm from '@/components/AccountSetupForm'
import type { Profile } from '@/types/database'

export default async function AccountSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const { reset } = await searchParams
  const isReset = reset === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .limit(1)

  const profile = (profileRows as unknown as Pick<Profile, 'display_name'>[] | null)?.[0]
  const emailPrefix = user.email?.split('@')[0] ?? ''
  const initialDisplayName = profile?.display_name ?? emailPrefix

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AccountSetupForm
          isReset={isReset}
          initialDisplayName={initialDisplayName}
        />
      </div>
    </main>
  )
}
