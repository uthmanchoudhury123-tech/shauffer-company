import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { amount } = await req.json()
  const amountNum = Number(amount)
  if (!amountNum || amountNum < 1) {
    return NextResponse.json({ error: 'Minimum withdrawal is £1' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check wallet balance
  const { data: wallet } = await admin
    .from('driver_wallets')
    .select('balance')
    .eq('driver_id', user.id)
    .single()

  if (!wallet || wallet.balance < amountNum) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Check Connect account is onboarded
  const { data: stripeAccount } = await admin
    .from('stripe_accounts')
    .select('stripe_connect_id, connect_onboarded')
    .eq('driver_id', user.id)
    .single()

  if (!stripeAccount?.stripe_connect_id || !stripeAccount?.connect_onboarded) {
    return NextResponse.json({ error: 'Please set up your payout account first' }, { status: 400 })
  }

  // Deduct from wallet first
  await admin.from('driver_wallets').update({
    balance: wallet.balance - amountNum,
    updated_at: new Date().toISOString(),
  }).eq('driver_id', user.id)

  // Record the withdrawal transaction
  await admin.from('wallet_transactions').insert({
    driver_id: user.id,
    amount: -amountNum,
    type: 'withdrawal',
    description: 'Bank withdrawal via Stripe',
  })

  // Transfer funds to driver's Stripe Connect account
  await stripe.transfers.create({
    amount: Math.round(amountNum * 100), // pence
    currency: 'gbp',
    destination: stripeAccount.stripe_connect_id,
    description: `Wallet withdrawal for driver ${user.id}`,
  })

  // In-app notification
  await admin.from('freelancer_notifications').insert({
    user_id: user.id,
    title: 'Withdrawal initiated',
    body: `£${amountNum.toFixed(2)} is on its way to your bank account.`,
    type: 'payment_received',
    link: '/dashboard/freelancer/wallet',
  })

  return NextResponse.json({ ok: true, balance: wallet.balance - amountNum })
}
