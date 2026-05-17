'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  newPassword: z.string().min(6).max(72),
})

export async function changePassword(
  newPassword: string
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = schema.safeParse({ newPassword })
  if (!parsed.success) {
    return { success: false, error: 'Password must be between 6 and 72 characters.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
  if (error) {
    console.error('[profile] password update error:', error)
    return { success: false, error: 'Could not update password. Please try again.' }
  }

  return { success: true }
}
