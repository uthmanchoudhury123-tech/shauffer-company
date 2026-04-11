import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called by the DOING driver to mark job in_progress / complete
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId, action } = await req.json()  // action: 'start' | 'done'
  if (!jobId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: job } = await supabase
    .from('freelancer_jobs')
    .select('id, posted_by, accepted_driver_id, status, price')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.accepted_driver_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  if (action === 'start') {
    if (job.status !== 'filled') return NextResponse.json({ error: 'Job not ready to start' }, { status: 400 })
    await admin.from('freelancer_jobs').update({ status: 'in_progress' }).eq('id', jobId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'done') {
    if (job.status !== 'in_progress') return NextResponse.json({ error: 'Job not in progress' }, { status: 400 })
    // Mark as completed — poster still needs to release funds
    await admin.from('freelancer_jobs').update({ status: 'completed' }).eq('id', jobId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
