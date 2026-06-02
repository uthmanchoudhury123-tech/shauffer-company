import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DriverWalletClient } from './DriverWalletClient'

export default async function DriverWalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    admin.from('driver_wallets').select('balance').eq('driver_id', user.id).single(),
    admin
      .from('wallet_transactions')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <DriverWalletClient
      balance={wallet?.balance ?? 0}
      transactions={transactions ?? []}
    />
  )
}
