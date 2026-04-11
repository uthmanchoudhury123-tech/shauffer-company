import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — list open freelancer jobs (excluding own)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('freelancer_jobs')
    .select(`
      *,
      posted_by_driver:drivers!freelancer_jobs_posted_by_fkey(id, full_name, rating, car_type),
      job_applications(id, applicant_id, status)
    `)
    .eq('status', 'open')
    .neq('posted_by', user.id)
    .order('job_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create a new freelancer job listing
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { pickup_address, dropoff_address, job_date, job_time, price,
          preferred_car_type, required_car_make, required_car_model, notes } = body

  if (!pickup_address || !dropoff_address || !job_date || !job_time || !price) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check wallet balance
  const { data: wallet } = await supabase
    .from('driver_wallets')
    .select('balance')
    .eq('driver_id', user.id)
    .single()

  if (!wallet || wallet.balance < Number(price)) {
    return NextResponse.json({ error: 'Insufficient wallet balance to post this job' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Deduct from wallet (escrow hold)
  const { error: walletErr } = await admin
    .from('driver_wallets')
    .update({ balance: wallet.balance - Number(price), updated_at: new Date().toISOString() })
    .eq('driver_id', user.id)

  if (walletErr) return NextResponse.json({ error: walletErr.message }, { status: 500 })

  // Record transaction
  await admin.from('wallet_transactions').insert({
    driver_id: user.id,
    amount: -Number(price),
    type: 'escrow_hold',
    description: `Funds held for job: ${pickup_address} → ${dropoff_address}`,
  })

  // Create job
  const { data: job, error: jobErr } = await admin
    .from('freelancer_jobs')
    .insert({
      posted_by: user.id,
      pickup_address,
      dropoff_address,
      job_date,
      job_time,
      price: Number(price),
      preferred_car_type: preferred_car_type || null,
      required_car_make: required_car_make || null,
      required_car_model: required_car_model || null,
      notes: notes || null,
      escrow_held: true,
    })
    .select()
    .single()

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 })
  return NextResponse.json(job)
}
