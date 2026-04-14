import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SuperAdminShell } from '@/components/layout/SuperAdminShell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)
  if (role !== 'super_admin') redirect('/auth/login')

  return <SuperAdminShell>{children}</SuperAdminShell>
}
