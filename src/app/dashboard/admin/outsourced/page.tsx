import { createClient } from '@/lib/supabase/server'
import { OutsourcedClient } from './OutsourcedClient'

export default async function OutsourcedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, id')
    .eq('id', user.id)
    .single()

  // Fetch outsourced jobs (jobs with no company driver, posted to freelancers)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', profile?.company_id)
    .eq('is_outsourced', true)
    .order('created_at', { ascending: false })

  // Fetch all jobs that could be outsourced (pending/unassigned)
  const { data: unassignedJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', profile?.company_id)
    .eq('status', 'pending')
    .is('driver_id', null)
    .order('job_date', { ascending: true })

  return (
    <OutsourcedClient
      outsourcedJobs={jobs ?? []}
      unassignedJobs={unassignedJobs ?? []}
      companyId={profile?.company_id ?? ''}
      adminId={profile?.id ?? ''}
    />
  )
}
