import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { amount } = await req.json()
  const amountNum = Number(amount)
  if (!amountNum || amountNum < 1) {
    return NextResponse.json({ error: 'Minimum top-up is £1' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get or create Stripe customer
  let { data: stripeAccount } = await admin
    .from('stripe_accounts')
    .select('stripe_customer_id')
    .eq('driver_id', user.id)
    .single()

  let customerId = stripeAccount?.stripe_customer_id

  if (!customerId) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const customer = await platformStripe.customers.create({
      email: profile?.email ?? user.email,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_id: user.id },
    })
    customerId = customer.id

    await admin.from('stripe_accounts').upsert({
      driver_id: user.id,
      stripe_customer_id: customerId,
    })
  }

  const origin = req.headers.get('origin') ?? 'https://shauffer-company.vercel.app'

  // Create Stripe Checkout Session
  const session = await platformStripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'Wallet Top-Up',
          description: `Add £${amountNum.toFixed(2)} to your driver wallet`,
        },
        unit_amount: Math.round(amountNum * 100), // pence
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${origin}/dashboard/freelancer/wallet?topup=success`,
    cancel_url: `${origin}/dashboard/freelancer/wallet?topup=cancelled`,
    metadata: {
      supabase_user_id: user.id,
      action: 'wallet_topup',
      amount: amountNum.toString(),
    },
  })

  return NextResponse.json({ url: session.url })
}
