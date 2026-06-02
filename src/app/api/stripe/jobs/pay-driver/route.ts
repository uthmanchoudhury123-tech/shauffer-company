import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch job
  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .select('id, pickup_address, dropoff_address, price, driver_id, payment_status, company_id')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.payment_status === 'paid') return NextResponse.json({ error: 'Job already paid' }, { status: 400 })
  if (!job.driver_id) return NextResponse.json({ error: 'No driver assigned to this job' }, { status: 400 })
  if (!job.price || job.price <= 0) return NextResponse.json({ error: 'Job has no price set' }, { status: 400 })

  // Check company wallet balance
  const { data: wallet } = await admin
    .from('company_wallets')
    .select('balance')
    .eq('company_id', job.company_id)
    .single()

  const currentBalance = wallet?.balance ?? 0
  if (currentBalance < job.price) {
    return NextResponse.json({
      error: `Insufficient wallet balance. You have £${currentBalance.toFixed(2)} but need £${job.price.toFixed(2)}. Please top up your wallet first.`,
      insufficient: true,
      balance: currentBalance,
      required: job.price,
    }, { status: 400 })
  }

  const newCompanyBalance = currentBalance - job.price

  // Deduct from company wallet
  await admin.from('company_wallets').update({
    balance: newCompanyBalance,
    updated_at: new Date().toISOString(),
  }).eq('company_id', job.company_id)

  // Record company wallet transaction
  await admin.from('company_wallet_transactions').insert({
    company_id: job.company_id,
    amount: -job.price,
    type: 'payment',
    description: `Driver payment: ${job.pickup_address} → ${job.dropoff_address}`,
    job_id: jobId,
  })

  // Credit driver wallet
  const { data: driverWallet } = await admin
    .from('driver_wallets')
    .select('balance')
    .eq('driver_id', job.driver_id)
    .single()

  const newDriverBalance = (driverWallet?.balance ?? 0) + job.price
  await admin.from('driver_wallets').upsert({
    driver_id: job.driver_id,
    balance: newDriverBalance,
    updated_at: new Date().toISOString(),
  })

  // Driver wallet transaction
  await admin.from('wallet_transactions').insert({
    driver_id: job.driver_id,
    amount: job.price,
    type: 'payment_received',
    description: `Job payment: ${job.pickup_address} → ${job.dropoff_address}`,
  })

  // Mark job as paid
  await admin.from('jobs').update({ payment_status: 'paid' }).eq('id', jobId)

  return NextResponse.json({ success: true, newBalance: newCompanyBalance })
}
