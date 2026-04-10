import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to the intended page or dashboard after successful verification
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If something went wrong, redirect to login with an error message
  return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`)
}
