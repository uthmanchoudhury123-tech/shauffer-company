import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomId } = await params

  // Verify membership
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, poster_id, driver_id')
    .eq('id', roomId)
    .single()

  if (!room || (room.poster_id !== user.id && room.driver_id !== user.id)) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, body, sender_id, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}
