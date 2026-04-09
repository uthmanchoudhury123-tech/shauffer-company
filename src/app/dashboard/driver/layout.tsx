import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DriverSidebar } from '@/components/layout/DriverSidebar'

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DriverSidebar driverName={profile?.full_name ?? 'Driver'} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
