import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { CompanySetupBanner } from '@/components/CompanySetupBanner'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, full_name, company_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)
  if (role !== 'company_admin') {
    redirect('/dashboard/driver')
  }

  return (
    <AdminShell>
      {!profile?.company_id && <CompanySetupBanner />}
      {children}
    </AdminShell>
  )
}
