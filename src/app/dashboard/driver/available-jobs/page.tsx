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
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Get driver's active vehicles
  const { data: myVehicles } = await supabase
    .from('company_driver_vehicles')
    .select('id, car_type, make, model, registration')
    .eq('driver_id', driver?.id)
    .eq('is_active', true)

  const myCarTypes = [...new Set((myVehicles ?? []).map(v => v.car_type))]

  // Get open jobs for this company (pending + open_for_applications)
  let jobsQuery = supabase
    .from('jobs')
    .select('*')
    .eq('company_id', profile?.company_id)
    .eq('open_for_applications', true)
    .is('driver_id', null)
    .order('job_date', { ascending: true })

  const { data: allOpenJobs } = await jobsQuery

  // Filter to jobs matching driver's car types
  const matchingJobs = (allOpenJobs ?? []).filter(j =>
    !j.preferred_car_type || myCarTypes.includes(j.preferred_car_type)
  )

  // Get driver's existing applications
  const { data: myApplications } = await supabase
    .from('job_applications')
    .select('job_id, status, id')
    .eq('driver_id', driver?.id)

  return (
    <AvailableJobsClient
      jobs={matchingJobs}
      allOpenJobs={allOpenJobs ?? []}
      myVehicles={myVehicles ?? []}
      myApplications={myApplications ?? []}
      driverId={driver?.id ?? ''}
      companyId={profile?.company_id ?? ''}
      hasVehicles={(myVehicles ?? []).length > 0}
    />
  )
}
