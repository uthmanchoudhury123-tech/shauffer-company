import { createClient } from '@/lib/supabase/server'
import { AdminWalletClient } from './AdminWalletClient'

export default async function AdminWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = profile?.company_id ?? ''

  // Wallet balance + transactions
  const [
    { data: walletRow },
    { data: walletTxs },
    { data: jobs },
  ] = await Promise.all([
    supabase
      .from('company_wallets')
      .select('balance')
      .eq('company_id', companyId)
      .single(),

    supabase
      .from('company_wallet_transactions')
      .select('id, amount, type, description, job_id, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('jobs')
      .select('id, pickup_address, dropoff_address, job_date, job_time, price, payment_status, driver_id, price_type, job_type')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('job_date', { ascending: false }),
  ])

  // Enrich with driver names
  const driverIds = [...new Set((jobs ?? []).map(j => j.driver_id).filter(Boolean))]
  const { data: drivers } = driverIds.length > 0
    ? await supabase.from('drivers').select('id, full_name').in('id', driverIds)
    : { data: [] }

  const driverMap = Object.fromEntries((drivers ?? []).map(d => [d.id, d.full_name]))

  const enriched = (jobs ?? []).map(j => ({
    ...j,
    driver_name: j.driver_id ? (driverMap[j.driver_id] ?? 'Unknown Driver') : null,
  }))

  return (
    <AdminWalletClient
      walletBalance={walletRow?.balance ?? 0}
      walletTransactions={walletTxs ?? []}
      jobs={enriched}
    />
  )
}
