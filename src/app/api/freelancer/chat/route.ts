import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — list chat rooms for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('chat_rooms')
    .select(`
      id, created_at, job_id,
      job:freelancer_jobs(id, pickup_address, dropoff_address, job_date, status),
      poster:drivers!chat_rooms_poster_id_fkey(id, full_name),
      driver:drivers!chat_rooms_driver_id_fkey(id, full_name)
    `)
    .or(`poster_id.eq.${user.id},driver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return NextResponse.json({ rooms: data ?? [] })
}

// POST — send a message to a room
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { room_id, body } = await req.json()
  if (!room_id || !body?.trim()) {
    return NextResponse.json({ error: 'room_id and body are required' }, { status: 400 })
  }

  // Verify user is a member of this room
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, poster_id, driver_id')
    .eq('id', room_id)
    .single()

  if (!room || (room.poster_id !== user.id && room.driver_id !== user.id)) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })
  }

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({ room_id, sender_id: user.id, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message })
}
