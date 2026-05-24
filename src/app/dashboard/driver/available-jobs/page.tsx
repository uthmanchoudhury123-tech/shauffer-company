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

  // Get all open jobs for this company (we'll filter by visibility in JS)
  const { data: allOpenJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', profile?.company_id ?? '')
    .eq('open_for_applications', true)
    .is('driver_id', null)
    .order('job_date', { ascending: true })

  // Visibility filter:
  //   'company'  → show to all company drivers (default)
  //   'platform' → show to everyone, including company drivers
  //   'direct'   → only if user.id is in target_driver_ids
  const visibilityFiltered = (allOpenJobs ?? []).filter(j => {
    const vis = j.visibility ?? 'company'
    if (vis === 'company' || vis === 'platform') return true
    if (vis === 'direct') {
      const ids: string[] = Array.isArray(j.target_driver_ids) ? j.target_driver_ids : []
      return ids.includes(user.id)
    }
    return false
  })

  // Further filter to jobs matching driver's car type
  const driverCarType = driver?.car_type
  const matchingJobs = visibilityFiltered.filter(j =>
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
      allOpenJobs={visibilityFiltered}
      myVehicles={companyVehicles ?? []}
      myApplications={myApplications ?? []}
      driverId={user.id}
      companyId={profile?.company_id ?? ''}
      hasVehicles={(companyVehicles ?? []).length > 0}
    />
  )
}
