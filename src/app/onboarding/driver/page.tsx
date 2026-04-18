import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DriverOnboardingClient } from './DriverOnboardingClient'

export default async function DriverOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)

  // Only drivers come here
  if (role === 'company_admin') redirect('/dashboard/admin')
  if (role === 'super_admin') redirect('/dashboard/superadmin')

  // Check if already completed
  const { data: driver } = await supabase
    .from('drivers')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  if (driver?.onboarding_complete) {
    redirect(role === 'freelance_driver' ? '/dashboard/freelancer' : '/dashboard/driver')
  }

  return (
    <DriverOnboardingClient
      userId={user.id}
      defaultName={profile?.full_name ?? ''}
      email={profile?.email ?? user.email ?? ''}
      role={role ?? 'company_driver'}
    />
  )
}
