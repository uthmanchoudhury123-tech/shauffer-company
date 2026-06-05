import { createClient } from '@/lib/supabase/server'
import { PostJobClient } from './PostJobClient'

export default async function PostJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name')
    .eq('id', user.id)
    .single()

  return (
    <PostJobClient
      driverId={user.id}
      companyId={profile?.company_id ?? null}
      driverName={profile?.full_name ?? 'Driver'}
    />
  )
}
