import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompanyOnboardingClient } from './CompanyOnboardingClient'

export default async function CompanyOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'company_admin') redirect('/dashboard/driver')
  // Already set up — go straight to dashboard
  if (profile?.company_id) redirect('/dashboard/admin')

  return <CompanyOnboardingClient />
}
