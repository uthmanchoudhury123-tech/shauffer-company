import { createClient } from '@/lib/supabase/server'
import { FreelancerProfileClient } from './FreelancerProfileClient'

export default async function FreelancerProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: driver }] = await Promise.all([
    supabase.from('user_profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('drivers')
      .select('car_type, licence_number, licence_expiry, photo_url, phone, rating, rating_count, is_verified')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  return (
    <FreelancerProfileClient
      userId={user.id}
      profile={profile ?? null}
      driver={driver ?? null}
    />
  )
}
