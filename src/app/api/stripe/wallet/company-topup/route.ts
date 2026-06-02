import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

// Use platform Stripe key directly (no stripeAccount) — this is a platform-level charge
const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { amount } = body
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      return NextResponse.json({ error: 'Minimum top-up is £1' }, { status: 400 })
    }

    const admin = createAdminClient()
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shauffer-company.vercel.app'

    // Get company_id for this user
    const { data: profile, error: profileErr } = await admin
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.company_id) {
      return NextResponse.json({ error: 'No company found for this user' }, { status: 400 })
    }

    const amountPounds = parseFloat(Number(amount).toFixed(2))

    const session = await platformStripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(amountPounds * 100),
          product_data: {
            name: 'Wallet Top-Up',
            description: `Add £${amountPounds.toFixed(2)} to your company wallet to pay drivers`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        action: 'company_topup',
        company_id: profile.company_id,
        amount: String(amountPounds),
      },
      success_url: `${origin}/dashboard/admin/wallet?topup=success`,
      cancel_url:  `${origin}/dashboard/admin/wallet?topup=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[company-topup] error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
