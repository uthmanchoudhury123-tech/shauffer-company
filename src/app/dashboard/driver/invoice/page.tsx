import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceClient } from '../../admin/jobs/invoice/InvoiceClient'

interface Props { searchParams: Promise<{ job?: string }> }

export default async function DriverInvoicePage({ searchParams }: Props) {
  const { job: jobId } = await searchParams
  if (!jobId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name')
    .eq('id', user.id)
    .single()

  // Fetch job — must be assigned to this driver or created by them
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .or(`driver_id.eq.${user.id},created_by.eq.${user.id}`)
    .single()

  if (!job) notFound()

  // Try to get company details (may be null for freelance drivers)
  const { data: company } = profile?.company_id
    ? await supabase
        .from('companies')
        .select('name, logo_url, address, email, phone')
        .eq('id', profile.company_id)
        .single()
    : { data: null }

  // Build a minimal company object using driver's own name if no company
  const companyData = company ?? {
    name: profile?.full_name ?? 'Driver',
    logo_url: null,
    address: null,
    email: null,
    phone: null,
  }

  return (
    <InvoiceClient
      job={job}
      company={companyData}
      driverName={profile?.full_name ?? null}
    />
  )
}
