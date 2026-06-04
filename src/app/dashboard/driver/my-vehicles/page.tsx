import { createClient } from '@/lib/supabase/server'
import { MyVehiclesClient } from './MyVehiclesClient'

export default async function MyVehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Load this driver's own registered vehicles
  const { data: vehicles } = await supabase
    .from('company_driver_vehicles')
    .select('*')
    .eq('driver_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <MyVehiclesClient
      vehicles={vehicles ?? []}
      driverId={user.id}
      companyId={profile?.company_id ?? ''}
    />
  )
}
