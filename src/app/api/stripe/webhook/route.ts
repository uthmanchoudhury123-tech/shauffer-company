import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { supabase_user_id, action, amount } = session.metadata ?? {}

    if (action === 'wallet_topup' && supabase_user_id && amount) {
      const topupAmount = parseFloat(amount)

      // Get current balance
      const { data: wallet } = await admin
        .from('driver_wallets')
        .select('balance')
        .eq('driver_id', supabase_user_id)
        .single()

      const newBalance = (wallet?.balance ?? 0) + topupAmount

      // Update wallet balance
      await admin.from('driver_wallets').upsert({
        driver_id: supabase_user_id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })

      // Record transaction
      await admin.from('wallet_transactions').insert({
        driver_id: supabase_user_id,
        amount: topupAmount,
        type: 'topup',
        description: `Stripe top-up (${session.payment_intent})`,
      })

      // Send in-app notification
      await admin.from('freelancer_notifications').insert({
        user_id: supabase_user_id,
        title: 'Wallet topped up!',
        body: `£${topupAmount.toFixed(2)} has been added to your wallet.`,
        type: 'payment_received',
        link: '/dashboard/freelancer/wallet',
      })
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const isOnboarded = account.details_submitted && account.charges_enabled

    if (isOnboarded) {
      await admin
        .from('stripe_accounts')
        .update({ connect_onboarded: true })
        .eq('stripe_connect_id', account.id)
    }
  }

  return NextResponse.json({ received: true })
}
