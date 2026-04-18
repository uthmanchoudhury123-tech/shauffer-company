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

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)

  if (role === 'company_admin')  redirect('/dashboard/admin')
  if (role === 'company_driver') redirect('/dashboard/driver')
  if (role === 'super_admin')    redirect('/dashboard/superadmin')

  // Fetch driver photo + wallet
  const [{ data: driver }, { data: wallet }] = await Promise.all([
    supabase.from('drivers').select('photo_url').eq('id', user.id).maybeSingle(),
    supabase.from('driver_wallets').select('balance').eq('driver_id', user.id).single(),
  ])

  return (
    <FreelancerShell
      driverName={profile?.full_name ?? 'Driver'}
      photoUrl={driver?.photo_url ?? null}
      email={user.email ?? ''}
      balance={wallet?.balance ?? 0}
    >
      {children}
    </FreelancerShell>
  )
}
