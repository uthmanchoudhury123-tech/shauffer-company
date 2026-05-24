import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  // Use admin client to search across all drivers regardless of RLS
  const admin = createAdminClient()
  const { data: drivers } = await admin
    .from('drivers')
    .select('id, full_name, car_type, driver_category, company_id, companies(name)')
    .ilike('full_name', `%${q}%`)
    .neq('id', user.id)  // exclude self
    .limit(10)

  return NextResponse.json(
    (drivers ?? []).map((d: any) => ({
      id: d.id,
      full_name: d.full_name,
      car_type: d.car_type,
      driver_category: d.driver_category,
      company_name: d.companies?.name ?? null,
    }))
  )
}
