'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { displayNameSchema } from '@/lib/validation/profile'
import { revalidateLeaderboard } from '@/lib/cache'

// ── Password ─────────────────────────────────────────────────────────────────

const passwordSchema = z.object({
  newPassword: z.string().min(6).max(72),
})

export async function changePassword(
  newPassword: string
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = passwordSchema.safeParse({ newPassword })
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

// ── Username ──────────────────────────────────────────────────────────────────

export async function changeUsername(
  formData: FormData
): Promise<{ success: true; displayName: string } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const raw = formData.get('displayName')
  const parsed = displayNameSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid username.' }
  }

  const newName = parsed.data

  // Fetch current name to detect no-op
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .limit(1)

  const currentName = (profileRows as Array<{ display_name: string }> | null)?.[0]?.display_name
  if (currentName === newName) return { success: true, displayName: newName }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: newName } as never)
    .eq('id', user.id)

  if (error) {
    // PostgreSQL unique violation
    if (error.code === '23505') {
      return { success: false, error: 'That username is already taken.' }
    }
    console.error('[changeUsername]', error)
    return { success: false, error: 'Could not update username. Please try again.' }
  }

  revalidatePath('/profile')
  revalidatePath('/profile/edit')
  revalidatePath(`/users/${user.id}`)
  revalidateLeaderboard()

  return { success: true, displayName: newName }
}

// ── Delete account ────────────────────────────────────────────────────────────

export async function deleteAccount(
  formData: FormData
): Promise<{ success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  // Email confirmation guard
  const submittedEmail = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  if (!submittedEmail || submittedEmail !== (user.email ?? '').toLowerCase()) {
    return { success: false, error: 'Email address does not match.' }
  }

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const db = createServiceClient(url, svcKey, { auth: { persistSession: false } })

  try {
    // 1. Handle leagues owned by this user
    const { data: ownedLeagues } = await db
      .from('leagues')
      .select('id')
      .eq('created_by', user.id)

    for (const league of (ownedLeagues ?? []) as Array<{ id: number }>) {
      // Find the longest-tenured non-owner member
      const { data: members } = await db
        .from('league_memberships')
        .select('user_id, joined_at')
        .eq('league_id', league.id)
        .neq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)

      const successor = (members as Array<{ user_id: string }> | null)?.[0]

      if (successor) {
        await db
          .from('leagues')
          .update({ created_by: successor.user_id })
          .eq('id', league.id)
      } else {
        // No other members — delete the league (cascades memberships)
        await db.from('leagues').delete().eq('id', league.id)
      }
    }

    // 2. Delete predictions (belt and braces — CASCADE would handle these too)
    await db.from('group_predictions').delete().eq('user_id', user.id)
    await db.from('knockout_predictions').delete().eq('user_id', user.id)
    await db.from('award_predictions').delete().eq('user_id', user.id)

    // 3. Remove league memberships
    await db.from('league_memberships').delete().eq('user_id', user.id)

    // 4. Delete profile
    await db.from('profiles').delete().eq('id', user.id)

    // 5. Delete from auth.users
    const { error: deleteError } = await db.auth.admin.deleteUser(user.id)
    if (deleteError) throw new Error(`auth.admin.deleteUser: ${deleteError.message}`)

    // 6. Clear session cookie
    try {
      await supabase.auth.signOut()
    } catch {
      // Session already invalidated by deleteUser — ignore
    }
  } catch (err) {
    console.error('[deleteAccount]', err)
    return {
      success: false,
      error: 'Deletion failed. Some data may have been partially deleted — contact support.',
    }
  }

  redirect('/login?deleted=1')
}
