import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const admin = createAdminClient()
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shauffer-company.vercel.app'

  // Fetch job with driver info
  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .select('id, pickup_address, dropoff_address, price, driver_id, payment_status, company_id')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.payment_status === 'paid') return NextResponse.json({ error: 'Job already paid' }, { status: 400 })
  if (!job.driver_id) return NextResponse.json({ error: 'No driver assigned to this job' }, { status: 400 })
  if (job.price <= 0) return NextResponse.json({ error: 'Job has no price set' }, { status: 400 })

  const { data: driver } = await admin
    .from('drivers')
    .select('full_name')
    .eq('id', job.driver_id)
    .single()

  const description = `${job.pickup_address} → ${job.dropoff_address}`

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: Math.round(job.price * 100),
        product_data: {
          name: `Driver Payment — ${driver?.full_name ?? 'Driver'}`,
          description,
        },
      },
      quantity: 1,
    }],
    metadata: {
      action: 'job_payment',
      job_id: jobId,
      driver_id: job.driver_id,
      amount: String(job.price),
      company_id: job.company_id ?? '',
    },
    success_url: `${origin}/dashboard/admin/jobs?payment=success`,
    cancel_url:  `${origin}/dashboard/admin/jobs?payment=cancelled`,
  })

  // Save session id to job so webhook can correlate
  await admin
    .from('jobs')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', jobId)

  return NextResponse.json({ url: session.url })
}
