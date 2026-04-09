import { createClient } from '@/lib/supabase/server'
import { DispatchClient } from './DispatchClient'

export default async function DispatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const [{ data: jobs }, { data: drivers }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('company_id', profile?.company_id)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .order('job_date', { ascending: true }),
    supabase
      .from('drivers')
      .select('id, full_name, availability_status, car_type, current_lat, current_lng')
      .eq('company_id', profile?.company_id),
  ])

  return <DispatchClient jobs={jobs ?? []} drivers={drivers ?? []} />
}
