import { createClient } from '@/lib/supabase/server'
import { JobsClient } from './JobsClient'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, id')
    .eq('id', user.id)
    .single()

  // Fetch jobs and drivers in parallel
  const [{ data: jobs }, { data: drivers }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('job_date', { ascending: false }),
    supabase
      .from('drivers')
      .select('id, full_name, availability_status, car_type')
      .eq('company_id', profile?.company_id),
  ])

  return (
    <JobsClient
      jobs={jobs ?? []}
      drivers={drivers ?? []}
      companyId={profile?.company_id ?? ''}
      createdBy={profile?.id ?? ''}
    />
  )
}
