'use server'

import { createClient } from '@/lib/supabase/server'

export async function markWelcomeShown() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }
  await supabase.from('profiles').update({ welcome_shown: true } as never).eq('id', user.id)
  return { success: true }
}

export async function markKnockoutAnnounceShown() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }
  await supabase.from('profiles').update({ knockout_announce_shown: true } as never).eq('id', user.id)
  return { success: true }
}
