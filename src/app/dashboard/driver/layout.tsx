import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverShell } from '@/components/layout/DriverShell'

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Admins should use the admin dashboard
  if (profile?.role === 'company_admin') {
    redirect('/dashboard/admin')
  }

  return <DriverShell driverName={profile?.full_name ?? 'Driver'}>{children}</DriverShell>
}
