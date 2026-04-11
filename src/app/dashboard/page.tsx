import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Central role-based redirect — always server-side, never cached
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'company_admin') redirect('/dashboard/admin')
  if (profile?.role === 'freelance_driver') redirect('/dashboard/freelancer')
  if (profile?.role === 'super_admin') redirect('/dashboard/superadmin')

  // Default: company driver
  redirect('/dashboard/driver')
}
