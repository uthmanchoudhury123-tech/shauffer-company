import { createClient } from '@/lib/supabase/server'
import { HistoryClient } from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: postedCompleted }, { data: doneCompleted }, { data: wallet }] = await Promise.all([
    // Jobs I posted that are completed
    supabase
      .from('freelancer_jobs')
      .select(`
        id, pickup_address, dropoff_address, job_date, job_time, price, status, created_at,
        driver:drivers!freelancer_jobs_accepted_driver_id_fkey(id, full_name)
      `)
      .eq('posted_by', user!.id)
      .eq('status', 'completed')
      .order('job_date', { ascending: false }),

    // Jobs I completed as the doing driver
    supabase
      .from('freelancer_jobs')
      .select(`
        id, pickup_address, dropoff_address, job_date, job_time, price, status, created_at, funds_released,
        poster:drivers!freelancer_jobs_posted_by_fkey(id, full_name)
      `)
      .eq('accepted_driver_id', user!.id)
      .eq('status', 'completed')
      .order('job_date', { ascending: false }),

    // Wallet for earnings summary
    supabase
      .from('driver_wallets')
      .select('balance')
      .eq('driver_id', user!.id)
      .single(),
  ])

  return (
    <HistoryClient
      postedCompleted={(postedCompleted ?? []) as any}
      doneCompleted={(doneCompleted ?? []) as any}
      balance={wallet?.balance ?? 0}
      driverId={user!.id}
    />
  )
}
