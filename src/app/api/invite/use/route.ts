import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()

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

  // Update the user's profile with the company
  await admin
    .from('user_profiles')
    .update({ company_id: invite.company_id, role: invite.role })
    .eq('id', user.id)

  // Create the drivers record if it doesn't exist
  await admin
    .from('drivers')
    .upsert({
      id: user.id,
      company_id: invite.company_id,
      full_name: user.user_metadata?.full_name ?? '',
      driver_category: 'company',
      availability_status: 'offline',
      car_type: 'saloon',
    }, { onConflict: 'id' })

  // Mark the invite as used
  await admin
    .from('invites')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ success: true })
}
