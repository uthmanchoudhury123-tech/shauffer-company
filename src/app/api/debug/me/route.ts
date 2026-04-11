import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Not logged in' })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    auth_email: user.email,
    auth_id: user.id,
    profile_role: profile?.role,
    profile_name: profile?.full_name,
    profile_found: !!profile,
  })
}
