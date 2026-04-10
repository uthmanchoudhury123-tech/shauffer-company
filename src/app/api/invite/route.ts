import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'company_admin') {
    return NextResponse.json({ error: 'Only admins can send invites' }, { status: 403 })
  }
  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Set up your company first' }, { status: 400 })
  }

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      company_id: profile.company_id,
      email: email?.trim() || null,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = request.headers.get('origin') ?? ''
  const link = `${origin}/invite/${invite.token}`

  return NextResponse.json({ link })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  const { error } = await supabase
    .from('invites')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
