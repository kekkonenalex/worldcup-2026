'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setupAccount(input: {
  displayName?: string
  password: string
  isReset: boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }

  if (!input.password || input.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  if (!input.isReset) {
    const name = input.displayName?.trim() ?? ''
    if (name.length < 2 || name.length > 30) {
      return { success: false, error: 'Display name must be 2–30 characters.' }
    }
  }

  const { error: authError } = await supabase.auth.updateUser({ password: input.password })
  if (authError) {
    return { success: false, error: authError.message }
  }

  const profileUpdate = input.isReset
    ? { password_set: true }
    : { display_name: input.displayName!.trim(), password_set: true }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate as never)
    .eq('id', user.id)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
