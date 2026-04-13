import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('stripe_accounts')
    .select('stripe_connect_id, connect_onboarded')
    .eq('driver_id', user.id)
    .single()

  return NextResponse.json({
    has_connect: !!data?.stripe_connect_id,
    onboarded: data?.connect_onboarded ?? false,
  })
}
