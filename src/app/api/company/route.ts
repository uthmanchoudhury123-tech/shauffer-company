import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface CompanyBody {
  name?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  postcode?: string
  country?: string
  description?: string
  logo_url?: string
}

// POST — create company (onboarding)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CompanyBody = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: company, error: companyErr } = await admin
    .from('companies')
    .insert({
      name:        body.name.trim(),
      phone:       body.phone       || null,
      email:       body.email       || null,
      website:     body.website     || null,
      address:     body.address     || null,
      city:        body.city        || null,
      postcode:    body.postcode    || null,
      country:     body.country     || 'United Kingdom',
      description: body.description || null,
      logo_url:    body.logo_url    || null,
    })
    .select('id')
    .single()

  if (companyErr) return NextResponse.json({ error: companyErr.message }, { status: 500 })

  await admin
    .from('user_profiles')
    .update({ company_id: company.id })
    .eq('id', user.id)

  return NextResponse.json({ company_id: company.id })
}

// PUT — update existing company (settings page)
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return NextResponse.json({ error: 'No company found' }, { status: 400 })
  if (profile.role !== 'company_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body: CompanyBody = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  const admin = createAdminClient()

  const { error } = await admin
    .from('companies')
    .update({
      name:        body.name.trim(),
      phone:       body.phone       || null,
      email:       body.email       || null,
      website:     body.website     || null,
      address:     body.address     || null,
      city:        body.city        || null,
      postcode:    body.postcode    || null,
      country:     body.country     || 'United Kingdom',
      description: body.description || null,
      logo_url:    body.logo_url    || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', profile.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
