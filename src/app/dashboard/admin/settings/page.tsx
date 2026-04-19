import { createClient } from '@/lib/supabase/server'
import { CompanySettingsClient } from './CompanySettingsClient'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name, email')
    .eq('id', user.id)
    .single()

  let company = null
  if (profile?.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('id, name, phone, email, website, address, city, postcode, country, description, logo_url')
      .eq('id', profile.company_id)
      .single()
    company = data
  }

  return (
    <CompanySettingsClient
      company={company}
      adminName={profile?.full_name ?? ''}
      adminEmail={profile?.email ?? ''}
      userId={user.id}
    />
  )
}
