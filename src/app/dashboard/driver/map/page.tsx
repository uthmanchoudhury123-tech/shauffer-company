import { createClient } from '@/lib/supabase/server'
import { DriverMapClient } from './DriverMapClient'

export default async function DriverMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = profile?.company_id ?? null

  // Get jobs this driver created/posted that are currently in progress
  // so we know which assigned drivers to track
  const { data: postedJobs } = await supabase
    .from('jobs')
    .select('id, driver_id, pickup_address, dropoff_address, status')
    .eq('created_by', user.id)
    .in('status', ['in_progress', 'assigned'])
    .not('driver_id', 'is', null)

  const assignedDriverIds = (postedJobs ?? [])
    .map(j => j.driver_id as string)
    .filter(Boolean)

  // Fetch drivers to show on map:
  // - If company driver → all company drivers (so they can see colleagues too)
  // - Always include any driver assigned to their posted jobs
  let driversQuery = supabase
    .from('drivers')
    .select('id, full_name, availability_status, current_lat, current_lng, car_type, location_updated_at')

  if (companyId) {
    // Company driver: show all company drivers
    driversQuery = driversQuery.eq('company_id', companyId)
  } else if (assignedDriverIds.length > 0) {
    // Freelance driver: only show drivers assigned to their jobs
    driversQuery = driversQuery.in('id', assignedDriverIds)
  } else {
    // Freelance driver with no active posted jobs → empty
    return (
      <DriverMapClient
        drivers={[]}
        postedJobs={[]}
        currentDriverId={user.id}
        mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''}
      />
    )
  }

  const { data: drivers } = await driversQuery

  return (
    <DriverMapClient
      drivers={drivers ?? []}
      postedJobs={postedJobs ?? []}
      currentDriverId={user.id}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''}
    />
  )
}
