import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { CompanySetupBanner } from '@/components/CompanySetupBanner'
import { SubscriptionGate } from '@/components/SubscriptionGate'

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

  // Fetch subscription info if company exists
  let company = null
  if (profile?.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('subscription_status, trial_ends_at, stripe_subscription_id')
      .eq('id', profile.company_id)
      .single()
    company = data
  }

  return (
    <AdminShell>
      {!profile?.company_id && <CompanySetupBanner />}
      {profile?.company_id && company && (
        <SubscriptionGate
          status={company.subscription_status ?? 'trialing'}
          trialEndsAt={company.trial_ends_at ?? null}
          hasSubscription={!!company.stripe_subscription_id}
        />
      )}
      {children}
    </AdminShell>
  )
}
