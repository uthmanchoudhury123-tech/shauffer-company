import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('freelancer_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ notifications: data ?? [] })
}

// PATCH — mark one or all notifications as read
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id } = body

  if (id) {
    // Mark a single notification as read
    await supabase
      .from('freelancer_notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id)
  } else {
    // Mark all as read
    await supabase
      .from('freelancer_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  return NextResponse.json({ success: true })
}
