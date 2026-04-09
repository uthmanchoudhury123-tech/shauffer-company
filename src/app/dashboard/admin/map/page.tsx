import { createClient } from '@/lib/supabase/server'
import { MapClient } from './MapClient'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Get all drivers with location data
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, full_name, availability_status, current_lat, current_lng, car_type, location_updated_at')
    .eq('company_id', profile?.company_id)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

  return <MapClient drivers={drivers ?? []} mapboxToken={mapboxToken} />
}
