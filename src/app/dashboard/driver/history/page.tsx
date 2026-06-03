import { createClient } from '@/lib/supabase/server'
import { DriverHistoryClient } from './DriverHistoryClient'

export default async function DriverHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, pickup_address, dropoff_address, job_date, job_time, price, status, notes, driver_id, payment_status, price_type, job_type')
    .eq('driver_id', user.id)
    .in('status', ['completed', 'awaiting_confirmation'])
    .order('job_date', { ascending: false })

  // Ratings for these jobs
  const jobIds = (jobs ?? []).map(j => j.id)
  const { data: reviews } = jobIds.length > 0
    ? await supabase
        .from('job_reviews')
        .select('job_id, rating, comment')
        .in('job_id', jobIds)
    : { data: [] }

  const reviewMap = Object.fromEntries((reviews ?? []).map(r => [r.job_id, r]))

  return <DriverHistoryClient jobs={jobs ?? []} reviewMap={reviewMap} />
}
