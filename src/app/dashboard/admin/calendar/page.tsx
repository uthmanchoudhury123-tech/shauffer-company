import { createClient } from '@/lib/supabase/server'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_date, job_time, pickup_address, dropoff_address, status, driver_id')
    .eq('company_id', profile?.company_id)
    .order('job_date', { ascending: true })

  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, full_name')
    .eq('company_id', profile?.company_id)

  return <CalendarClient jobs={jobs ?? []} drivers={drivers ?? []} />
}
