import { createClient } from '@/lib/supabase/server'
import { SignClient } from './SignClient'

export default async function SignPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, company_id')
    .eq('id', user.id)
    .single()

  const { data: company } = profile?.company_id ? await supabase
    .from('companies')
    .select('name, logo_url')
    .eq('id', profile.company_id)
    .single() : { data: null }

  let job = null
  if (params.job) {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', params.job)
      .single()
    job = data
  }

  return (
    <SignClient
      driverName={profile?.full_name ?? 'Driver'}
      companyName={company?.name ?? 'Chauffeur Service'}
      companyLogo={company?.logo_url ?? null}
      job={job}
    />
  )
}
