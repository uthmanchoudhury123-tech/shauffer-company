import { createClient } from '@/lib/supabase/server'
import { DriverDashboardClient } from './DriverDashboardClient'
import { FreelanceDashboardClient } from './FreelanceDashboardClient'

export default async function DriverDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, company_id, role')
    .eq('id', user.id)
    .single()

  const isFreelance = profile?.role === 'freelance_driver'

  const { data: driverProfile } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', user.id)
    .single()

  if (isFreelance) {
    // Freelance driver: fetch assigned/won jobs + jobs they posted
    const [
      { data: assignedJobs },
      { data: postedJobs },
      { count: marketplaceCount },
      { data: wallet },
    ] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .eq('driver_id', user.id)
        .order('job_date', { ascending: true }),

      supabase
        .from('freelancer_jobs')
        .select('id, job_date, job_time, pickup_address, dropoff_address, price, status')
        .eq('posted_by', user.id)
        .order('job_date', { ascending: false })
        .limit(20),

      supabase
        .from('freelancer_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .neq('posted_by', user.id),

      supabase
        .from('driver_wallets')
        .select('balance')
        .eq('driver_id', user.id)
        .maybeSingle(),
    ])

    return (
      <FreelanceDashboardClient
        driverName={profile?.full_name ?? 'Driver'}
        driverProfile={driverProfile ?? null}
        assignedJobs={assignedJobs ?? []}
        postedJobs={(postedJobs ?? []) as any}
        marketplaceCount={marketplaceCount ?? 0}
        driverId={user.id}
        walletBalance={wallet?.balance ?? 0}
      />
    )
  }

  // Company driver dashboard (original)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('driver_id', user.id)
    .order('job_date', { ascending: true })

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
