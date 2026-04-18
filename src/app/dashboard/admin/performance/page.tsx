import { createClient } from '@/lib/supabase/server'
import { Users, Briefcase, CheckCircle2, TrendingUp, Star, Clock } from 'lucide-react'

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = profile?.company_id

  const [{ data: drivers }, { data: jobs }] = await Promise.all([
    supabase.from('drivers').select('id, full_name, availability_status').eq('company_id', companyId),
    supabase.from('jobs').select('*').eq('company_id', companyId),
  ])

  // Build per-driver stats
  const driverStats = (drivers ?? []).map(driver => {
    const driverJobs = (jobs ?? []).filter(j => j.driver_id === driver.id)
    const completed = driverJobs.filter(j => j.status === 'completed').length
    const total = driverJobs.length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const inProgress = driverJobs.filter(j => j.status === 'in_progress').length
    return { ...driver, completed, total, completionRate, inProgress }
  }).sort((a, b) => b.completed - a.completed)

  const totalJobs = jobs?.length ?? 0
  const completedJobs = jobs?.filter(j => j.status === 'completed').length ?? 0
  const overallRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
  const activeDrivers = drivers?.filter(d => d.availability_status !== 'offline').length ?? 0

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Driver performance metrics and job completion rates</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Drivers', value: drivers?.length ?? 0, icon: Users, color: 'blue' },
          { label: 'Active Drivers', value: activeDrivers, icon: CheckCircle2, color: 'green' },
          { label: 'Jobs Completed', value: completedJobs, icon: Briefcase, color: 'purple' },
          { label: 'Completion Rate', value: `${overallRate}%`, icon: TrendingUp, color: 'orange' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-${card.color}-50`}>
              <card.icon className={`w-5 h-5 text-${card.color}-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Driver performance table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Driver Leaderboard</h2>
        </div>

        {driverStats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No drivers yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobs Done</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Jobs</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {driverStats.map((driver, i) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                        ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-100 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-gray-50 text-gray-400'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-700">
                            {driver.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{driver.full_name}</span>
                        {i === 0 && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                        ${driver.availability_status === 'available' ? 'bg-green-100 text-green-700' :
                          driver.availability_status === 'on_job' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full
                          ${driver.availability_status === 'available' ? 'bg-green-500' :
                            driver.availability_status === 'on_job' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        {driver.availability_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{driver.completed}</td>
                    <td className="px-5 py-3.5 text-right text-gray-500">{driver.total}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-semibold ${
                        driver.completionRate >= 80 ? 'text-green-600' :
                        driver.completionRate >= 50 ? 'text-yellow-600' : 'text-red-500'
                      }`}>{driver.completionRate}%</span>
                    </td>
                    <td className="px-5 py-3.5 w-32">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            driver.completionRate >= 80 ? 'bg-green-500' :
                            driver.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${driver.completionRate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* In-progress jobs */}
      {(jobs ?? []).filter(j => j.status === 'in_progress').length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Currently Active Jobs
          </h2>
          <div className="space-y-2">
            {(jobs ?? []).filter(j => j.status === 'in_progress').map(job => {
              const driver = drivers?.find(d => d.id === job.driver_id)
              return (
                <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{job.pickup_address} → {job.dropoff_address}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Driver: {driver?.full_name ?? 'Unassigned'}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">In Progress</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
