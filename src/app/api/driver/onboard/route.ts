import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    full_name, phone, car_type, licence_number, licence_expiry, photo_url,
    tfl_licence_number, tfl_licence_expiry, tfl_licence_photo,
    hertz_licence_number, hertz_licence_expiry, hertz_licence_photo,
    dvla_licence_photo,
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
      licence_number: licence_number || null,
      licence_expiry: licence_expiry || null,
      photo_url: photo_url || null,
      tfl_licence_number: tfl_licence_number || null,
      tfl_licence_expiry: tfl_licence_expiry || null,
      tfl_licence_photo: tfl_licence_photo || null,
      hertz_licence_number: hertz_licence_number || null,
      hertz_licence_expiry: hertz_licence_expiry || null,
      hertz_licence_photo: hertz_licence_photo || null,
      dvla_licence_photo: dvla_licence_photo || null,
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
