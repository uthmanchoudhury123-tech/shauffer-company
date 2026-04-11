import { createClient } from '@/lib/supabase/server'
import { WalletClient } from './WalletClient'

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: wallet }, { data: transactions }] = await Promise.all([
    supabase
      .from('driver_wallets')
      .select('balance')
      .eq('driver_id', user!.id)
      .single(),

    supabase
      .from('wallet_transactions')
      .select('*')
      .eq('driver_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <WalletClient
      balance={wallet?.balance ?? 0}
      transactions={transactions ?? []}
    />
  )
}
