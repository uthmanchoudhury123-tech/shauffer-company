import { createClient } from '@/lib/supabase/server'
import { AvailableJobsClient } from './AvailableJobsClient'

export default async function AvailableJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: allFreelancerJobs },
    { data: myApplications },
    { data: driverProfile },
    { data: platformCompanyJobs },
  ] = await Promise.all([
    // Freelancer marketplace jobs — fetch all open, not my own; filter visibility in JS
    supabase
      .from('freelancer_jobs')
      .select(`
        *,
        posted_by_driver:drivers!freelancer_jobs_posted_by_fkey(id, full_name, rating)
      `)
      .eq('status', 'open')
      .neq('posted_by', user.id)
      .order('job_date', { ascending: true }),

    supabase
      .from('job_applications')
      .select('job_id, status')
      .eq('applicant_id', user.id),

    supabase
      .from('drivers')
      .select('id, full_name, car_type')
      .eq('id', user.id)
      .single(),

    // Company jobs posted as 'platform' (visible to all drivers incl. freelancers)
    supabase
      .from('jobs')
      .select('id, pickup_address, dropoff_address, job_date, job_time, price, preferred_car_type, notes, visibility, target_driver_ids')
      .eq('visibility', 'platform')
      .eq('open_for_applications', true)
      .is('driver_id', null)
      .order('job_date', { ascending: true }),
  ])

  // Filter freelancer_jobs by visibility:
  //   'all'    → visible to everyone
  //   'direct' → only if user.id is in target_driver_ids
  const visibleFreelancerJobs = (allFreelancerJobs ?? []).filter(j => {
    if (!j.visibility || j.visibility === 'all') return true
    if (j.visibility === 'direct') {
      const ids: string[] = Array.isArray(j.target_driver_ids) ? j.target_driver_ids : []
      return ids.includes(user.id)
    }
    return true
  })

  // Normalise platform company jobs to share the same shape as FreelancerJob
  // (no posted_by_driver for company jobs — we mark with a synthetic field)
  const normalisedCompanyJobs = (platformCompanyJobs ?? []).map((j: any) => ({
    ...j,
    required_car_make: null,
    required_car_model: null,
    posted_by_driver: null,
    _source: 'company' as const,
  }))

  const allJobs = [...visibleFreelancerJobs, ...normalisedCompanyJobs]

  const appliedJobIds = new Set((myApplications ?? []).map(a => a.job_id))

  return (
    <AvailableJobsClient
      jobs={allJobs}
      appliedJobIds={Array.from(appliedJobIds)}
      driverId={user.id}
    />
  )
}
