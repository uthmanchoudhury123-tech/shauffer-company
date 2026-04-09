import { createClient } from '@/lib/supabase/server'
import { DriversClient } from './DriversClient'

export default async function DriversPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .eq('company_id', profile?.company_id)
    .order('created_at', { ascending: false })

  return <DriversClient drivers={drivers ?? []} companyId={profile?.company_id ?? ''} />
}
