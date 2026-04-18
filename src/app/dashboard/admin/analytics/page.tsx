import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Briefcase, CheckCircle2, Clock, XCircle, Users } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = profile?.company_id

  const [{ data: jobs }, { data: drivers }] = await Promise.all([
    supabase.from('jobs').select('*').eq('company_id', companyId).order('job_date', { ascending: true }),
    supabase.from('drivers').select('id, availability_status').eq('company_id', companyId),
  ])

  const allJobs = jobs ?? []

  // Status breakdown
  const statusCounts = {
    completed:   allJobs.filter(j => j.status === 'completed').length,
    in_progress: allJobs.filter(j => j.status === 'in_progress').length,
    pending:     allJobs.filter(j => j.status === 'pending').length,
    assigned:    allJobs.filter(j => j.status === 'assigned').length,
    cancelled:   allJobs.filter(j => j.status === 'cancelled').length,
  }
  const total = allJobs.length

  // Jobs over last 7 days
  const last7: { label: string; date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    const count = allJobs.filter(j => j.job_date === key).length
    last7.push({ label, date: key, count })
  }
  const maxDay = Math.max(...last7.map(d => d.count), 1)

  // Jobs by day of week (all time)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const byDayOfWeek = Array(7).fill(0)
  allJobs.forEach(job => {
    const day = new Date(job.job_date + 'T00:00:00').getDay()
    byDayOfWeek[day]++
  })
  const maxDow = Math.max(...byDayOfWeek, 1)

  // Jobs per month (last 6 months)
  const monthlyData: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    const yr = d.getFullYear()
    const mo = d.getMonth() + 1
    const count = allJobs.filter(j => {
      const [y, m] = j.job_date.split('-').map(Number)
      return y === yr && m === mo
    }).length
    monthlyData.push({ label, count })
  }
  const maxMonth = Math.max(...monthlyData.map(m => m.count), 1)

  const completionRate = total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Job trends and fleet performance insights</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Jobs', value: total, icon: Briefcase, color: 'blue' },
          { label: 'Completed', value: statusCounts.completed, icon: CheckCircle2, color: 'green' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'purple' },
          { label: 'Cancelled', value: statusCounts.cancelled, icon: XCircle, color: 'red' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Jobs last 7 days bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Jobs — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-32">
            {last7.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{day.count || ''}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className="w-full rounded-t-md bg-blue-500 transition-all min-h-[4px]"
                    style={{ height: `${Math.max((day.count / maxDay) * 80, day.count > 0 ? 4 : 0)}px` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Monthly Trend</h2>
          <div className="flex items-end gap-2 h-32">
            {monthlyData.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{m.count || ''}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className="w-full rounded-t-md bg-purple-500 transition-all min-h-[4px]"
                    style={{ height: `${Math.max((m.count / maxMonth) * 80, m.count > 0 ? 4 : 0)}px` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Job Status Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Completed', key: 'completed', color: 'bg-green-500' },
              { label: 'In Progress', key: 'in_progress', color: 'bg-purple-500' },
              { label: 'Assigned', key: 'assigned', color: 'bg-blue-500' },
              { label: 'Pending', key: 'pending', color: 'bg-yellow-500' },
              { label: 'Cancelled', key: 'cancelled', color: 'bg-red-400' },
            ].map(item => {
              const count = statusCounts[item.key as keyof typeof statusCounts]
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="text-gray-800 font-medium">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Busiest days of week */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Busiest Days of the Week</h2>
          <div className="flex items-end gap-2 h-32">
            {dayLabels.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{byDayOfWeek[i] || ''}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className="w-full rounded-t-md bg-orange-400 transition-all min-h-[4px]"
                    style={{ height: `${Math.max((byDayOfWeek[i] / maxDow) * 80, byDayOfWeek[i] > 0 ? 4 : 0)}px` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
