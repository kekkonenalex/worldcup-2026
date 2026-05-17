import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const isReset = searchParams.get('reset') === 'true'

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check whether this user has completed account setup
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('password_set')
    .eq('id', user.id)
    .limit(1)

  const passwordSet = (profileRows as unknown as { password_set: boolean }[] | null)?.[0]?.password_set ?? false

  // First-time user: always send to full setup regardless of reset param
  if (!passwordSet) {
    return NextResponse.redirect(new URL('/account/setup', request.url))
  }

  // Returning user who explicitly requested a password reset
  if (isReset) {
    return NextResponse.redirect(new URL('/account/setup?reset=true', request.url))
  }

  // Returning user signing in via link — go straight to home
  return NextResponse.redirect(new URL('/', request.url))
}
