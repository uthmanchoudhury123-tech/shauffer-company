import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FreelancerShell } from '@/components/layout/FreelancerShell'

export default async function FreelancerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Only freelance drivers access this dashboard
  if (profile?.role === 'company_admin') redirect('/dashboard/admin')
  if (profile?.role === 'company_driver') redirect('/dashboard/driver')
  if (profile?.role === 'super_admin') redirect('/dashboard/superadmin')

  // Fetch wallet balance
  const { data: wallet } = await supabase
    .from('driver_wallets')
    .select('balance')
    .eq('driver_id', user.id)
    .single()

  return (
    <FreelancerShell
      driverName={profile?.full_name ?? 'Driver'}
      balance={wallet?.balance ?? 0}
    >
      {children}
    </FreelancerShell>
  )
}
