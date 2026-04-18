import { createClient } from '@/lib/supabase/server'
import { DriverProfileClient } from './DriverProfileClient'

export default async function DriverProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: driver }] = await Promise.all([
    supabase.from('user_profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('drivers').select('*').eq('id', user.id).single(),
  ])

  return (
    <DriverProfileClient
      userId={user.id}
      profile={profile ?? null}
      driver={driver ?? null}
    />
  )
}
