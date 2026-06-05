import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from './landing/LandingPage'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Guest — show landing page
  if (!user) {
    return <LandingPage />
  }

  // Logged-in — redirect to correct dashboard
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'company_admin') {
    redirect('/dashboard/admin')
  } else {
    redirect('/dashboard/driver')
  }
}
