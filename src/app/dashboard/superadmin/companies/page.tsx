import { createClient } from '@/lib/supabase/server'
import { CompaniesClient } from './CompaniesClient'

export default async function SuperAdminCompaniesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, is_active, is_suspended, subscription_plan, created_at')
    .order('created_at', { ascending: false })

  // Driver counts per company
  const { data: driverCounts } = await supabase
    .from('drivers')
    .select('company_id')

  const countMap: Record<string, number> = {}
  for (const d of driverCounts ?? []) {
    if (d.company_id) countMap[d.company_id] = (countMap[d.company_id] ?? 0) + 1
  }

  return (
    <CompaniesClient
      companies={(companies ?? []).map(c => ({ ...c, driverCount: countMap[c.id] ?? 0 }))}
    />
  )
}
