import { createClient } from '@/lib/supabase/server'
import { MyJobsClient } from './MyJobsClient'

export default async function MyJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: postedJobs }, { data: appliedJobs }] = await Promise.all([
    // Jobs I posted
    supabase
      .from('freelancer_jobs')
      .select(`
        *,
        job_applications(
          id, applicant_id, message, status,
          applicant:drivers!job_applications_applicant_id_fkey(id, full_name, rating, car_type)
        )
      `)
      .eq('posted_by', user!.id)
      .order('job_date', { ascending: true }),

    // Jobs I applied to
    supabase
      .from('job_applications')
      .select(`
        id, status, message,
        job:freelancer_jobs(
          id, pickup_address, dropoff_address, job_date, job_time,
          price, status, posted_by, funds_released,
          poster:drivers!freelancer_jobs_posted_by_fkey(id, full_name, rating)
        )
      `)
      .eq('applicant_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <MyJobsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postedJobs={(postedJobs ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appliedJobs={(appliedJobs ?? []) as any}
      driverId={user!.id}
    />
  )
}
