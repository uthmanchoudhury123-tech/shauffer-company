import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id)
    return NextResponse.json({ error: 'No company found' }, { status: 400 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', profile.company_id)
    .single()

  if (!company?.stripe_customer_id)
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.chauffex.com'

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${origin}/dashboard/admin/billing`,
  })

  return NextResponse.json({ url: session.url })
}
