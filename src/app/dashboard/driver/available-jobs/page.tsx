import { createClient } from '@/lib/supabase/server'
import { AvailableJobsClient } from './AvailableJobsClient'

export default async function AvailableJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: driver } = await supabase
    .from('drivers')
    .select('id, car_type')
    .eq('id', user.id)
    .maybeSingle()

  const { data: companyVehicles } = await supabase
    .from('vehicles')
    .select('id, car_type, make, model, registration')
    .eq('company_id', profile?.company_id ?? '')
    .eq('status', 'available')
    .order('make')

  // Fetch all three job sources in parallel
  const [
    { data: ownCompanyJobs },
    { data: platformJobs },
    { data: freelancerJobs },
  ] = await Promise.all([
    // 1. Own company internal jobs (company-only or direct)
    supabase
      .from('jobs')
      .select('*')
      .eq('company_id', profile?.company_id ?? '')
      .in('visibility', ['company', 'direct'])
      .eq('status', 'pending')
      .is('driver_id', null)
      .order('job_date', { ascending: true }),

    // 2. Jobs outsourced to all drivers (platform) from any company
    supabase
      .from('jobs')
      .select('*')
      .eq('visibility', 'platform')
      .eq('status', 'pending')
      .is('driver_id', null)
      .order('job_date', { ascending: true }),

    // 3. Freelancer marketplace jobs (not posted by this driver)
    supabase
      .from('freelancer_jobs')
      .select(`*, posted_by_driver:drivers!freelancer_jobs_posted_by_fkey(id, full_name, rating)`)
      .eq('status', 'open')
      .neq('posted_by', user.id)
      .order('job_date', { ascending: true }),
  ])

  // Filter own company jobs by visibility rules
  const filteredOwnJobs = (ownCompanyJobs ?? []).filter(j => {
    if (j.visibility === 'company') return j.open_for_applications === true
    if (j.visibility === 'direct') {
      const ids: string[] = Array.isArray(j.target_driver_ids) ? j.target_driver_ids : []
      return ids.includes(user.id)
    }
    return false
  }).map((j: any) => ({ ...j, _jobType: 'company' as const }))

  // Filter freelancer marketplace jobs by visibility
  const filteredFreelancerJobs = (freelancerJobs ?? []).filter((j: any) => {
    if (!j.visibility || j.visibility === 'all') return true
    if (j.visibility === 'direct') {
      const ids: string[] = Array.isArray(j.target_driver_ids) ? j.target_driver_ids : []
      return ids.includes(user.id)
    }
    return true
  }).map((j: any) => ({ ...j, _jobType: 'freelancer' as const }))

  const platformMapped = (platformJobs ?? []).map((j: any) => ({ ...j, _jobType: 'company' as const }))

  // Combine all job sources
  const allJobs = [...filteredOwnJobs, ...platformMapped, ...filteredFreelancerJobs]

  // Filter by car type
  const driverCarType = driver?.car_type
  const matchingJobs = allJobs.filter(j =>
    !j.preferred_car_type || j.preferred_car_type === driverCarType
  )

  const { data: myApplications } = await supabase
    .from('job_applications')
    .select('job_id, status, id')
    .eq('driver_id', user.id)

  return (
    <AvailableJobsClient
      jobs={matchingJobs}
      allOpenJobs={allJobs}
      myVehicles={companyVehicles ?? []}
      myApplications={myApplications ?? []}
      driverId={user.id}
      companyId={profile?.company_id ?? ''}
      hasVehicles={(companyVehicles ?? []).length > 0}
    />
  )
}
