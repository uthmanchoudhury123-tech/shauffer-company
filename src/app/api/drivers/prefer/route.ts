import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { driverId, preferred } = await req.json()
  if (!driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = profile?.company_id
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 })

  if (preferred) {
    const { error } = await supabase
      .from('preferred_drivers')
      .upsert({ company_id: companyId, driver_id: driverId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('preferred_drivers')
      .delete()
      .eq('company_id', companyId)
      .eq('driver_id', driverId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, preferred })
}
