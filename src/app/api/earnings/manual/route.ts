import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, description, source, job_date } = await req.json()

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 })
  }

  const validSources = ['cash', 'bank_transfer', 'other']
  if (source && !validSources.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('manual_earnings')
    .insert({
      driver_id: user.id,
      amount: Number(amount),
      description: description?.trim() || null,
      source: source || 'cash',
      job_date: job_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('manual_earnings')
    .select('*')
    .eq('driver_id', user.id)
    .order('job_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
