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

  // drivers.id = auth.uid() — no separate user_id column
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, car_type')
    .eq('id', user.id)
    .maybeSingle()

  // Company vehicles available for this driver to use when applying
  const { data: companyVehicles } = await supabase
    .from('vehicles')
    .select('id, car_type, make, model, registration')
    .eq('company_id', profile?.company_id ?? '')
    .eq('status', 'available')
    .order('make')

  // Get open jobs for this company
  const { data: allOpenJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', profile?.company_id ?? '')
    .eq('open_for_applications', true)
    .is('driver_id', null)
    .order('job_date', { ascending: true })

  // Filter to jobs matching driver's car type
  const driverCarType = driver?.car_type
  const matchingJobs = (allOpenJobs ?? []).filter(j =>
    !j.preferred_car_type || j.preferred_car_type === driverCarType
  )

  // Driver's existing applications
  const { data: myApplications } = await supabase
    .from('job_applications')
    .select('job_id, status, id')
    .eq('driver_id', user.id)

  return (
    <AvailableJobsClient
      jobs={matchingJobs}
      allOpenJobs={allOpenJobs ?? []}
      myVehicles={companyVehicles ?? []}
      myApplications={myApplications ?? []}
      driverId={user.id}
      companyId={profile?.company_id ?? ''}
      hasVehicles={(companyVehicles ?? []).length > 0}
    />
  )
}
