import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const PRICE_ID = 'price_1TNbJvBnwtNsNYJr3e0YzAGI'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id)
    return NextResponse.json({ error: 'No company found' }, { status: 400 })

  const admin = createAdminClient()

  // Get or create Stripe customer
  const { data: company } = await admin
    .from('companies')
    .select('id, name, stripe_customer_id')
    .eq('id', profile.company_id)
    .single()

  if (!company)
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  let customerId = company.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? user.email,
      name: company.name,
      metadata: { company_id: company.id, user_id: user.id },
    })
    customerId = customer.id

    await admin
      .from('companies')
      .update({ stripe_customer_id: customerId })
      .eq('id', company.id)
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.chauffex.com'

  // Create checkout session — trial_period_days gives 90 free days before first charge
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    subscription_data: {
      trial_period_days: 90,
      metadata: { company_id: company.id },
    },
    metadata: { company_id: company.id },
    success_url: `${origin}/dashboard/admin/billing?success=1`,
    cancel_url: `${origin}/dashboard/admin/billing?canceled=1`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return NextResponse.json({ url: session.url })
}
