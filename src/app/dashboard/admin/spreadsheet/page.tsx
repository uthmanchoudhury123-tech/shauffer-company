import { createClient } from '@/lib/supabase/server'
import { SpreadsheetClient } from './SpreadsheetClient'

export default async function SpreadsheetPage() {
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
      .order('job_date', { ascending: false }),
    supabase
      .from('drivers')
      .select('id, full_name')
      .eq('company_id', profile?.company_id),
  ])

  return <SpreadsheetClient jobs={jobs ?? []} drivers={drivers ?? []} />
}
