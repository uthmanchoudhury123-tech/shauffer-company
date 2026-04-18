import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverShell } from '@/components/layout/DriverShell'

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)

  if (role === 'company_admin')    redirect('/dashboard/admin')
  if (role === 'freelance_driver') redirect('/dashboard/freelancer')
  if (role === 'super_admin')      redirect('/dashboard/superadmin')

  // Fetch driver photo
  const { data: driver } = await supabase
    .from('drivers')
    .select('photo_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <DriverShell
      driverName={profile?.full_name ?? 'Driver'}
      photoUrl={driver?.photo_url ?? null}
    >
      {children}
    </DriverShell>
  )
}
