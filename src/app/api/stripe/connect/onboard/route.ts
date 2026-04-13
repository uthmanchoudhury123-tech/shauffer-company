import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  const origin = req.headers.get('origin') ?? 'https://shauffer-company.vercel.app'

  // Check if already has a Connect account
  let { data: stripeAccount } = await admin
    .from('stripe_accounts')
    .select('stripe_connect_id, connect_onboarded')
    .eq('driver_id', user.id)
    .single()

  let connectId = stripeAccount?.stripe_connect_id

  if (!connectId) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    try {
      // Create Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: profile?.email ?? user.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { supabase_id: user.id },
      })
      connectId = account.id

      await admin.from('stripe_accounts').upsert({
        driver_id: user.id,
        stripe_connect_id: connectId,
      })
    } catch (err: any) {
      console.error('Stripe Connect error:', err.message)
      return NextResponse.json(
        { error: err.message ?? 'Failed to create Stripe account' },
        { status: 500 }
      )
    }
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${origin}/dashboard/freelancer/wallet?connect=refresh`,
    return_url: `${origin}/dashboard/freelancer/wallet?connect=success`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
