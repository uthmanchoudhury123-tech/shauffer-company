import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  // Guard with a secret only you know — set SUPERADMIN_SECRET in env vars
  const { email, password, secret } = await req.json()

  if (!secret || secret !== process.env.SUPERADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create the Supabase auth user with role baked into user_metadata
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation
    user_metadata: { role: 'super_admin' },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Upsert into user_profiles
  const { error: profileError } = await admin.from('user_profiles').upsert({
    id: userId,
    email,
    full_name: 'Super Admin',
    role: 'super_admin',
  })

  if (profileError) {
    // Auth user was created — clean up to avoid orphan
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Super admin account created for ${email}`,
    user_id: userId,
  })
}
