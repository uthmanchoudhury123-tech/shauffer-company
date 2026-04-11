import { createClient } from '@/lib/supabase/server'
import { ScheduleClient } from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobs } = await supabase
    .from('freelancer_jobs')
    .select(`
      id, pickup_address, dropoff_address, job_date, job_time, price, status,
      poster:drivers!freelancer_jobs_posted_by_fkey(id, full_name)
    `)
    .eq('accepted_driver_id', user!.id)
    .in('status', ['accepted', 'in_progress'])
    .order('job_date', { ascending: true })
    .order('job_time', { ascending: true })

  return <ScheduleClient jobs={(jobs ?? []) as any} />
}
