import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('driver_vehicles')
    .select('*')
    .eq('driver_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ vehicles: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { make, model, year, color, reg_plate, vehicle_type } = await req.json()
  if (!make || !model || !reg_plate) {
    return NextResponse.json({ error: 'Make, model, and reg plate are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('driver_vehicles')
    .insert({ driver_id: user.id, make, model, year, color, reg_plate, vehicle_type })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vehicle: data })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })

  const { error } = await supabase
    .from('driver_vehicles')
    .delete()
    .eq('id', id)
    .eq('driver_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
