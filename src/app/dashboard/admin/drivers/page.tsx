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

  const [{ data: drivers }, { data: invites }, { data: preferred }] = await Promise.all([
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
    supabase
      .from('preferred_drivers')
      .select('driver_id')
      .eq('company_id', companyId),
  ])

  const preferredIds = (preferred ?? []).map((p: any) => p.driver_id)

  return (
    <DriversClient
      drivers={drivers ?? []}
      companyId={companyId}
      pendingInvites={invites ?? []}
      preferredDriverIds={preferredIds}
    />
  )
}
