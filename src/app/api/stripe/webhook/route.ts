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

  // ─── Checkout completed (wallet top-up OR job payment) ───────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { supabase_user_id, action, amount, job_id, driver_id } = session.metadata ?? {}

    // Wallet top-up (freelancer)
    if (action === 'wallet_topup' && supabase_user_id && amount) {
      const topupAmount = parseFloat(amount)
      const { data: wallet } = await admin
        .from('driver_wallets')
        .select('balance')
        .eq('driver_id', supabase_user_id)
        .single()

      const newBalance = (wallet?.balance ?? 0) + topupAmount
      await admin.from('driver_wallets').upsert({
        driver_id: supabase_user_id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      await admin.from('wallet_transactions').insert({
        driver_id: supabase_user_id,
        amount: topupAmount,
        type: 'topup',
        description: `Stripe top-up (${session.payment_intent})`,
      })
      await admin.from('freelancer_notifications').insert({
        user_id: supabase_user_id,
        title: 'Wallet topped up!',
        body: `£${topupAmount.toFixed(2)} has been added to your wallet.`,
        type: 'payment_received',
        link: '/dashboard/freelancer/wallet',
      })
    }

    // Job payment (company pays driver)
    if (action === 'job_payment' && job_id && driver_id && amount) {
      const jobAmount = parseFloat(amount)

      // Mark job as paid
      await admin
        .from('jobs')
        .update({ payment_status: 'paid' })
        .eq('id', job_id)

      // Credit driver wallet
      const { data: wallet } = await admin
        .from('driver_wallets')
        .select('balance')
        .eq('driver_id', driver_id)
        .single()

      const newBalance = (wallet?.balance ?? 0) + jobAmount
      await admin.from('driver_wallets').upsert({
        driver_id,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })

      // Transaction record
      const { data: job } = await admin
        .from('jobs')
        .select('pickup_address, dropoff_address, job_date')
        .eq('id', job_id)
        .single()

      await admin.from('wallet_transactions').insert({
        driver_id,
        amount: jobAmount,
        type: 'payment_received',
        description: job
          ? `Job payment: ${job.pickup_address} → ${job.dropoff_address}`
          : `Job payment (${job_id})`,
      })
    }
  }

  // ─── Stripe Connect ──────────────────────────────────────────────────────────
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    if (account.details_submitted && account.charges_enabled) {
      await admin
        .from('stripe_accounts')
        .update({ connect_onboarded: true })
        .eq('stripe_connect_id', account.id)
    }
  }

  // ─── Company subscription ────────────────────────────────────────────────────
  async function syncSubscription(sub: Stripe.Subscription) {
    const companyId = sub.metadata?.company_id
    if (!companyId) return

    let status: string
    switch (sub.status) {
      case 'trialing': status = 'trialing'; break
      case 'active':   status = 'active';   break
      case 'past_due': status = 'past_due'; break
      case 'canceled': status = 'canceled'; break
      default:         status = sub.status
    }

    const trialEnd = sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null
    // ended_at is set when the subscription is fully canceled/ended
    const endedAt = sub.ended_at
      ? new Date(sub.ended_at * 1000).toISOString()
      : null

    await admin
      .from('companies')
      .update({
        stripe_subscription_id: sub.id,
        subscription_status: status,
        ...(trialEnd ? { trial_ends_at: trialEnd } : {}),
        ...(endedAt ? { subscription_ends_at: endedAt } : {}),
      })
      .eq('id', companyId)
  }

  if (event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated') {
    await syncSubscription(event.data.object as Stripe.Subscription)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const companyId = sub.metadata?.company_id
    if (companyId) {
      await admin
        .from('companies')
        .update({
          subscription_status: 'canceled',
          subscription_ends_at: sub.ended_at
            ? new Date(sub.ended_at * 1000).toISOString()
            : new Date().toISOString(),
        })
        .eq('id', companyId)
    }
  }

  // Mark trial as expired when it ends without active subscription
  if (event.type === 'customer.subscription.trial_will_end') {
    // Just a heads-up event — no action needed, trial still running
  }

  return NextResponse.json({ received: true })
}
