import { createClient } from '@/lib/supabase/server'
import { BillingClient } from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  let company = null
  if (profile?.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('name, subscription_status, trial_ends_at, subscription_ends_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', profile.company_id)
      .single()
    company = data
  }

  return <BillingClient company={company} />
}
