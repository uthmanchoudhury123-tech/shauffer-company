import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId, message } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  // Verify job is still open and not posted by self
  const { data: job } = await supabase
    .from('freelancer_jobs')
    .select('id, status, posted_by')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'open') return NextResponse.json({ error: 'Job is no longer open' }, { status: 400 })
  if (job.posted_by === user.id) return NextResponse.json({ error: 'Cannot apply to your own job' }, { status: 400 })

  const { data, error } = await supabase
    .from('job_applications')
    .insert({ job_id: jobId, applicant_id: user.id, message: message || null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already applied' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
