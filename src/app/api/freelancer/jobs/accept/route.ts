import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId, applicationId, driverId } = await req.json()
  if (!jobId || !applicationId || !driverId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify caller is the job poster
  const { data: job } = await supabase
    .from('freelancer_jobs')
    .select('id, posted_by, status')
    .eq('id', jobId)
    .single()

  if (!job || job.posted_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (job.status !== 'open') {
    return NextResponse.json({ error: 'Job is no longer open' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Accept this application, reject all others
  await admin.from('job_applications')
    .update({ status: 'rejected' })
    .eq('job_id', jobId)
    .neq('id', applicationId)

  await admin.from('job_applications')
    .update({ status: 'accepted' })
    .eq('id', applicationId)

  // Update job status to filled
  const { error } = await admin
    .from('freelancer_jobs')
    .update({ status: 'filled', accepted_driver_id: driverId })
    .eq('id', jobId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create a chat room between poster and accepted driver
  await admin.from('chat_rooms').upsert(
    { job_id: jobId, poster_id: user.id, driver_id: driverId },
    { onConflict: 'job_id' }
  )

  return NextResponse.json({ ok: true })
}
