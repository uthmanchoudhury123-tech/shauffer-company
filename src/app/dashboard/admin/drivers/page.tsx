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

  const companyId = profile?.company_id ?? ''

  const [{ data: drivers }, { data: invites }] = await Promise.all([
    supabase
      .from('drivers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invites')
      .select('id, email, status, created_at, expires_at')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return (
    <DriversClient
      drivers={drivers ?? []}
      companyId={companyId}
      pendingInvites={invites ?? []}
    />
  )
}
