import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called by the POSTER to release funds to the doing driver
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const { data: job } = await supabase
    .from('freelancer_jobs')
    .select('id, posted_by, accepted_driver_id, status, price, funds_released')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.posted_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (job.status !== 'completed') return NextResponse.json({ error: 'Job not completed yet' }, { status: 400 })
  if (job.funds_released) return NextResponse.json({ error: 'Funds already released' }, { status: 400 })
  if (!job.accepted_driver_id) return NextResponse.json({ error: 'No assigned driver' }, { status: 400 })

  const admin = createAdminClient()

  // Credit doing driver's wallet
  const { data: doingWallet } = await admin
    .from('driver_wallets')
    .select('balance')
    .eq('driver_id', job.accepted_driver_id)
    .single()

  const currentBalance = doingWallet?.balance ?? 0

  await admin.from('driver_wallets').upsert({
    driver_id: job.accepted_driver_id,
    balance: currentBalance + Number(job.price),
    updated_at: new Date().toISOString(),
  })

  // Record transaction for doing driver
  await admin.from('wallet_transactions').insert({
    driver_id: job.accepted_driver_id,
    amount: Number(job.price),
    type: 'payment_received',
    description: `Payment for completed job`,
    reference_id: jobId,
  })

  // Record release transaction for poster
  await admin.from('wallet_transactions').insert({
    driver_id: user.id,
    amount: -Number(job.price),
    type: 'escrow_release',
    description: `Funds released for completed job`,
    reference_id: jobId,
  })

  // Mark funds released
  await admin.from('freelancer_jobs').update({ funds_released: true }).eq('id', jobId)

  return NextResponse.json({ ok: true })
}
