import { createClient } from '@/lib/supabase/server'
import { AvailableJobsClient } from './AvailableJobsClient'

export default async function AvailableJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: jobs }, { data: myApplications }, { data: driverProfile }] = await Promise.all([
    supabase
      .from('freelancer_jobs')
      .select(`
        *,
        posted_by_driver:drivers!freelancer_jobs_posted_by_fkey(id, full_name, rating)
      `)
      .eq('status', 'open')
      .neq('posted_by', user!.id)
      .order('job_date', { ascending: true }),

    supabase
      .from('job_applications')
      .select('job_id, status')
      .eq('applicant_id', user!.id),

    supabase
      .from('drivers')
      .select('id, full_name, car_type')
      .eq('id', user!.id)
      .single(),
  ])

  const appliedJobIds = new Set((myApplications ?? []).map(a => a.job_id))

  return (
    <AvailableJobsClient
      jobs={jobs ?? []}
      appliedJobIds={Array.from(appliedJobIds)}
      driverId={user!.id}
    />
  )
}
