import { createClient } from '@/lib/supabase/server'
import { DriverDashboardClient } from './DriverDashboardClient'

export default async function DriverDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, company_id')
    .eq('id', user.id)
    .single()

  const { data: driverProfile } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('driver_id', user.id)
    .order('job_date', { ascending: true })

  // Count open jobs for this driver's company (for badge)
  const { count: openJobsCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile?.company_id)
    .eq('open_for_applications', true)
    .is('driver_id', null)

  return (
    <DriverDashboardClient
      driverName={profile?.full_name ?? 'Driver'}
      driverProfile={driverProfile ?? null}
      jobs={jobs ?? []}
      driverId={user.id}
      openJobsCount={openJobsCount ?? 0}
    />
  )
}
