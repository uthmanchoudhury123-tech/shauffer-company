import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceClient } from './InvoiceClient'

interface Props { searchParams: Promise<{ job?: string }> }

export default async function InvoicePage({ searchParams }: Props) {
  const { job: jobId } = await searchParams
  if (!jobId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const [{ data: job }, { data: company }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('company_id', profile?.company_id ?? '')
      .single(),
    supabase
      .from('companies')
      .select('name, logo_url, address, email, phone')
      .eq('id', profile?.company_id ?? '')
      .single(),
  ])

  if (!job) notFound()

  // Get driver name if assigned
  let driverName: string | null = null
  if (job.driver_id) {
    const { data: driver } = await supabase
      .from('drivers')
      .select('full_name')
      .eq('id', job.driver_id)
      .single()
    driverName = driver?.full_name ?? null
  }

  return <InvoiceClient job={job} company={company} driverName={driverName} />
}
