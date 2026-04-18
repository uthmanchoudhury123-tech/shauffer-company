import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name, phone, car_type, licence_number, licence_expiry, photo_url } = await req.json()
  if (!full_name?.trim()) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })

  const admin = createAdminClient()

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    // Update display name in auth profile
    admin.from('user_profiles').update({ full_name: full_name.trim() }).eq('id', user.id),
    // Upsert driver record (may or may not already exist from invite flow)
    admin.from('drivers').upsert({
      id: user.id,
      full_name: full_name.trim(),
      phone: phone || null,
      car_type: car_type || 'saloon',
      licence_number: licence_number || null,
      licence_expiry: licence_expiry || null,
      photo_url: photo_url || null,
      onboarding_complete: true,
    }, { onConflict: 'id' }),
  ])

  if (e1 || e2) return NextResponse.json({ error: e1?.message ?? e2?.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
