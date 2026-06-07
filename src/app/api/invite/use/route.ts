import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { token, userId } = await request.json()

  if (!token) return NextResponse.json({ error: 'Missing invite token' }, { status: 400 })

  const admin = createAdminClient()

  // Validate the invite token
  const { data: invite, error: inviteErr } = await admin
    .from('invites')
    .select('id, company_id, role')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 })
  }

  // Resolve the user id — prefer the passed userId (from signUp response),
  // fall back to the currently-authenticated user
  let uid = userId as string | undefined
  if (!uid) {
    // Try to get from session (works when email confirmation is off)
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    uid = user?.id
  }

  if (!uid) {
    return NextResponse.json({ error: 'Could not identify user — please sign in and try again' }, { status: 401 })
  }

  const role = invite.role ?? 'company_driver'

  // Update the user's profile with the company + role
  await admin
    .from('user_profiles')
    .update({ company_id: invite.company_id, role })
    .eq('id', uid)

  // Fetch full name from user_profiles (written by the auth trigger on signup)
  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name')
    .eq('id', uid)
    .single()

  // Create/update the driver record
  // onboarding_complete: true — invited drivers skip standalone onboarding,
  // they're already linked to a company via the invite.
  await admin
    .from('drivers')
    .upsert({
      id: uid,
      company_id: invite.company_id,
      full_name: profile?.full_name ?? '',
      driver_category: 'company',
      availability_status: 'offline',
      car_type: 'saloon',
      onboarding_complete: true,
    }, { onConflict: 'id' })

  // Mark the invite as used
  await admin
    .from('invites')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ success: true })
}
