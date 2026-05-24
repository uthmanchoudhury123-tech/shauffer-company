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

  // Company vehicles available for this driver
  const { data: companyVehicles } = await supabase
    .from('vehicles')
    .select('id, car_type, make, model, registration')
    .eq('company_id', profile?.company_id ?? '')
    .eq('status', 'available')
    .order('make')

  // Fetch jobs in parallel:
  // A) Own company jobs (company / direct / platform visibility)
  // B) Platform jobs from ALL other companies (visibility = 'platform')
  const [{ data: ownCompanyJobs }, { data: platformJobs }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('company_id', profile?.company_id ?? '')
      .eq('status', 'pending')
      .is('driver_id', null)
      .order('job_date', { ascending: true }),

    supabase
      .from('jobs')
      .select('*')
      .eq('visibility', 'platform')
      .eq('status', 'pending')
      .is('driver_id', null)
      .neq('company_id', profile?.company_id ?? '') // avoid duplicates with own company
      .order('job_date', { ascending: true }),
  ])

  // Filter own company jobs by visibility rules
  const filteredOwnJobs = (ownCompanyJobs ?? []).filter(j => {
    const vis = j.visibility ?? 'company'
    if (vis === 'platform') return true
    if (vis === 'company') return j.open_for_applications === true
    if (vis === 'direct') {
      const ids: string[] = Array.isArray(j.target_driver_ids) ? j.target_driver_ids : []
      return ids.includes(user.id)
    }
    return false
  })

  // Platform jobs from other companies are always visible
  const allVisibleJobs = [...filteredOwnJobs, ...(platformJobs ?? [])]

  // Filter by car type match (job with no preferred type matches anyone)
  const driverCarType = driver?.car_type
  const matchingJobs = allVisibleJobs.filter(j =>
    !j.preferred_car_type || j.preferred_car_type === driverCarType
  )

  const { data: myApplications } = await supabase
    .from('job_applications')
    .select('job_id, status, id')
    .eq('driver_id', user.id)

  return (
    <AvailableJobsClient
      jobs={matchingJobs}
      allOpenJobs={allVisibleJobs}
      myVehicles={companyVehicles ?? []}
      myApplications={myApplications ?? []}
      driverId={user.id}
      companyId={profile?.company_id ?? ''}
      hasVehicles={(companyVehicles ?? []).length > 0}
    />
  )
}
