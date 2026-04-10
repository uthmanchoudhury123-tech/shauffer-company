import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  const admin = createAdminClient()

  // Create the company
  const { data: company, error: companyErr } = await admin
    .from('companies')
    .insert({ name: name.trim() })
    .select('id')
    .single()

  if (companyErr) return NextResponse.json({ error: companyErr.message }, { status: 500 })

  // Link admin's profile to the new company
  await admin
    .from('user_profiles')
    .update({ company_id: company.id })
    .eq('id', user.id)

  return NextResponse.json({ company_id: company.id })
}
