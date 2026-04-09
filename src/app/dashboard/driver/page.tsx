import { createClient } from '@/lib/supabase/server'
import { DriverDashboardClient } from './DriverDashboardClient'

export default async function DriverDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: driverProfile } = await supabase
    .from('drivers')
    .select('availability_status, rating, rating_count, is_verified, car_type')
    .eq('id', user.id)
    .single()

  // Jobs are ONLY visible when assigned to this driver (RLS enforces this)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('driver_id', user.id)
    .order('job_date', { ascending: true })

  return (
    <DriverDashboardClient
      driverName={profile?.full_name ?? 'Driver'}
      driverProfile={driverProfile ?? null}
      jobs={jobs ?? []}
      driverId={user.id}
    />
  )
}
