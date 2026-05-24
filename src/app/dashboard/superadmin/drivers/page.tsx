import { createAdminClient } from '@/lib/supabase/admin'
import { Users, Star, CheckCircle } from 'lucide-react'
import { carTypeLabel } from '@/lib/utils'

export default async function SuperAdminDriversPage() {
  const supabase = createAdminClient()

  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      id, full_name, car_type, availability_status, is_verified,
      rating, rating_count, driver_category, created_at,
      company:companies(name)
    `)
    .order('created_at', { ascending: false })

  const statusColor: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    on_job: 'bg-blue-100 text-blue-700',
    offline: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Drivers</h1>
        <p className="text-sm text-gray-500 mt-0.5">{drivers?.length ?? 0} drivers across all companies</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {(drivers ?? []).length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No drivers yet</p>
            </div>
          ) : (
            (drivers ?? []).map(driver => (
              <div key={driver.id} className="flex items-center justify-between px-5 py-3.5 gap-4 hover:bg-gray-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                    {driver.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{driver.full_name}</p>
                      {driver.is_verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                      {/* @ts-expect-error supabase nested type */}
                      {driver.company?.name && <span>{driver.company.name}</span>}
                      <span>{carTypeLabel(driver.car_type)}</span>
                      <span className="capitalize">{driver.driver_category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {driver.rating > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-yellow-600 font-medium">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      {driver.rating.toFixed(1)}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[driver.availability_status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {driver.availability_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
