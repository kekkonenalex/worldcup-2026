import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)

  const profile = (rows as unknown as Profile[] | null)?.[0]

  if (!profile?.is_admin) redirect('/dashboard')

  return { user, profile }
}
