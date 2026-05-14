import { createClient } from '@/lib/supabase/server'
import { EarningsClient } from '@/components/EarningsClient'

export default async function FreelancerEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, pickup_address, dropoff_address, job_date, job_time, price, status')
    .eq('driver_id', user.id)
    .eq('status', 'completed')
    .order('job_date', { ascending: false })

  return <EarningsClient jobs={jobs ?? []} role="freelancer" />
}
