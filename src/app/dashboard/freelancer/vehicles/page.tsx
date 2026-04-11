import { createClient } from '@/lib/supabase/server'
import { VehiclesClient } from './VehiclesClient'

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: vehicles } = await supabase
    .from('driver_vehicles')
    .select('*')
    .eq('driver_id', user!.id)
    .order('created_at', { ascending: false })

  return <VehiclesClient vehicles={vehicles ?? []} driverId={user!.id} />
}
