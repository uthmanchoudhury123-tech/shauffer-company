import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    full_name, phone, car_type, photo_url,
    // Vehicle
    vehicle_photo_outside, vehicle_photo_inside,
    // DVLA
    licence_number, licence_expiry,
    dvla_photo_front, dvla_photo_back,
    // TFL Driver
    tfl_licence_number, tfl_licence_expiry,
    tfl_driver_photo_front, tfl_driver_photo_back,
    // TFL Vehicle
    tfl_vehicle_number, tfl_vehicle_expiry,
    tfl_vehicle_photo_front, tfl_vehicle_photo_back,
    // Hertsmere
    hertsmere_number, hertsmere_expiry,
    hertsmere_photo_front, hertsmere_photo_back,
  } = await req.json()

  if (!full_name?.trim()) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })

  const admin = createAdminClient()

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    admin.from('user_profiles').update({ full_name: full_name.trim() }).eq('id', user.id),
    admin.from('drivers').upsert({
      id: user.id,
      full_name: full_name.trim(),
      phone: phone || null,
      car_type: car_type || 'saloon',
      photo_url: photo_url || null,
      // Vehicle
      vehicle_photo_outside: vehicle_photo_outside || null,
      vehicle_photo_inside:  vehicle_photo_inside  || null,
      // DVLA
      licence_number:   licence_number  || null,
      licence_expiry:   licence_expiry  || null,
      dvla_photo_front: dvla_photo_front || null,
      dvla_photo_back:  dvla_photo_back  || null,
      // TFL Driver
      tfl_licence_number:     tfl_licence_number     || null,
      tfl_licence_expiry:     tfl_licence_expiry     || null,
      tfl_driver_photo_front: tfl_driver_photo_front || null,
      tfl_driver_photo_back:  tfl_driver_photo_back  || null,
      // TFL Vehicle
      tfl_vehicle_number:      tfl_vehicle_number      || null,
      tfl_vehicle_expiry:      tfl_vehicle_expiry      || null,
      tfl_vehicle_photo_front: tfl_vehicle_photo_front || null,
      tfl_vehicle_photo_back:  tfl_vehicle_photo_back  || null,
      // Hertsmere
      hertsmere_number:      hertsmere_number      || null,
      hertsmere_expiry:      hertsmere_expiry      || null,
      hertsmere_photo_front: hertsmere_photo_front || null,
      hertsmere_photo_back:  hertsmere_photo_back  || null,
    }, { onConflict: 'id' }),
  ])

  if (e1) return NextResponse.json({ error: `Profile update failed: ${e1.message}` }, { status: 500 })
  if (e2) return NextResponse.json({ error: `Driver record failed: ${e2.message}` }, { status: 500 })

  const { error: e3 } = await admin
    .from('drivers')
    .update({ onboarding_complete: true })
    .eq('id', user.id)

  if (e3) return NextResponse.json({ error: `Could not mark onboarding complete: ${e3.message}` }, { status: 500 })

  return NextResponse.json({ success: true })
}
