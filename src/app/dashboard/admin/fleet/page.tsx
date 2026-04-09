import { createClient } from '@/lib/supabase/server'
import { FleetClient } from './FleetClient'

export default async function FleetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('company_id', profile?.company_id)
    .order('created_at', { ascending: false })

  return <FleetClient vehicles={vehicles ?? []} companyId={profile?.company_id ?? ''} />
}
