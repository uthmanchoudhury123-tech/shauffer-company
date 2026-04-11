import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { action, amount } = await req.json()
  if (!action || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: wallet } = await admin
    .from('driver_wallets')
    .select('balance')
    .eq('driver_id', user.id)
    .single()

  const currentBalance = wallet?.balance ?? 0

  if (action === 'topup') {
    // In production this would go through Stripe checkout first
    // For now we simulate a direct top-up (dev/testing)
    await admin.from('driver_wallets').upsert({
      driver_id: user.id,
      balance: currentBalance + Number(amount),
      updated_at: new Date().toISOString(),
    })
    await admin.from('wallet_transactions').insert({
      driver_id: user.id,
      amount: Number(amount),
      type: 'topup',
      description: 'Manual top-up',
    })
    return NextResponse.json({ ok: true, balance: currentBalance + Number(amount) })
  }

  if (action === 'withdraw') {
    if (currentBalance < Number(amount)) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }
    // In production this would trigger a Stripe Connect payout
    await admin.from('driver_wallets').update({
      balance: currentBalance - Number(amount),
      updated_at: new Date().toISOString(),
    }).eq('driver_id', user.id)

    await admin.from('wallet_transactions').insert({
      driver_id: user.id,
      amount: -Number(amount),
      type: 'withdrawal',
      description: 'Withdrawal request',
    })
    return NextResponse.json({ ok: true, balance: currentBalance - Number(amount) })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
