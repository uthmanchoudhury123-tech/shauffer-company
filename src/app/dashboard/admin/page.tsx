import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import {
  Car, Users, Briefcase, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, PoundSterling, ArrowUpRight
} from 'lucide-react'
import { formatDate, alertTypeLabel, alertSeverityColor, formatCurrency } from '@/lib/utils'
import type { Vehicle } from '@/types'
import { getComplianceAlerts } from '@/lib/utils'

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get company_id for this admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name')
    .eq('id', user.id)
    .single()

  const companyId = profile?.company_id

  // Fetch all data in parallel
  const [
    { data: vehicles },
    { data: drivers },
    { data: jobs },
  ] = await Promise.all([
    supabase.from('vehicles').select('*').eq('company_id', companyId),
    supabase.from('drivers').select('*').eq('company_id', companyId),
    supabase.from('jobs').select('*').eq('company_id', companyId),
  ])

  // Compute stats
  const totalVehicles = vehicles?.length ?? 0
  const availableVehicles = vehicles?.filter(v => v.status === 'available').length ?? 0
  const vehiclesOnJob = vehicles?.filter(v => v.status === 'on_job').length ?? 0
  const vehiclesOffRoad = vehicles?.filter(v => v.status === 'off_road').length ?? 0

  const totalDrivers = drivers?.length ?? 0
  const availableDrivers = drivers?.filter(d => d.availability_status === 'available').length ?? 0
  const driversOnJob = drivers?.filter(d => d.availability_status === 'on_job').length ?? 0

  const today = new Date().toISOString().split('T')[0]
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const weekStart = startOfWeek.toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const pendingJobs = jobs?.filter(j => j.status === 'pending').length ?? 0
  const activeJobs = jobs?.filter(j => j.status === 'in_progress').length ?? 0
  const completedJobs = jobs?.filter(j => j.status === 'completed') ?? []
  const completedToday = completedJobs.filter(j => j.job_date === today).length

  // Revenue = client_price if set, else fall back to price (job value)
  // Cost = price (what's paid to driver)
  const clientPrice = (j: any) => j.client_price ?? j.price ?? 0
  const driverCost  = (j: any) => j.price ?? 0
  const profit      = (j: any) => clientPrice(j) - driverCost(j)

  const revenueToday    = completedJobs.filter(j => j.job_date === today).reduce((s, j) => s + clientPrice(j), 0)
  const revenueWeek     = completedJobs.filter(j => j.job_date >= weekStart).reduce((s, j) => s + clientPrice(j), 0)
  const revenueMonth    = completedJobs.filter(j => j.job_date >= monthStart).reduce((s, j) => s + clientPrice(j), 0)
  const revenueAllTime  = completedJobs.reduce((s, j) => s + clientPrice(j), 0)
  const profitAllTime   = completedJobs.reduce((s, j) => s + profit(j), 0)
  const costAllTime     = completedJobs.reduce((s, j) => s + driverCost(j), 0)

  // Top earners by driver (driver cost = what they earn)
  const earningsByDriver: Record<string, { name: string; total: number; jobs: number }> = {}
  for (const job of completedJobs) {
    if (!job.driver_id) continue
    const driver = drivers?.find(d => d.id === job.driver_id)
    if (!earningsByDriver[job.driver_id]) {
      earningsByDriver[job.driver_id] = { name: driver?.full_name ?? 'Unknown', total: 0, jobs: 0 }
    }
    earningsByDriver[job.driver_id].total += driverCost(job)
    earningsByDriver[job.driver_id].jobs += 1
  }
  const topEarners = Object.values(earningsByDriver)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Last 6 months revenue + profit
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const monthJobs = completedJobs.filter(j => j.job_date >= ms && j.job_date <= me)
    const total       = monthJobs.reduce((s, j) => s + clientPrice(j), 0)
    const totalProfit = monthJobs.reduce((s, j) => s + profit(j), 0)
    return { label, total, profit: totalProfit }
  })
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.total), 1)

  // Compliance alerts
  const allAlerts = (vehicles as Vehicle[] ?? []).flatMap(v => getComplianceAlerts(v))
  const criticalAlerts = allAlerts.filter(a => a.daysUntilDue <= 7)

  // Recent jobs (last 5)
  const recentJobs = (jobs ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Vehicles"
          value={totalVehicles}
          icon={<Car className="w-5 h-5" />}
        />
        <StatCard
          label="Available Vehicles"
          value={availableVehicles}
          icon={<CheckCircle2 className="w-5 h-5" />}
          className="[&>div:first-child]:bg-green-50 [&>div:first-child]:text-green-600"
        />
        <StatCard
          label="Total Drivers"
          value={totalDrivers}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Active Jobs"
          value={activeJobs}
          icon={<TrendingUp className="w-5 h-5" />}
          className="[&>div:first-child]:bg-purple-50 [&>div:first-child]:text-purple-600"
        />
      </div>

      {/* Revenue Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Revenue",  value: revenueToday,   sub: `${completedJobs.filter(j=>j.job_date===today).length} jobs` },
          { label: 'This Week',        value: revenueWeek,    sub: `${completedJobs.filter(j=>j.job_date>=weekStart).length} jobs` },
          { label: 'This Month',       value: revenueMonth,   sub: `${completedJobs.filter(j=>j.job_date>=monthStart).length} jobs` },
          { label: 'All Time Revenue', value: revenueAllTime, sub: `${completedJobs.length} completed` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <PoundSterling className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Profit & Cost strip */}
      {completedJobs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <p className="text-xs font-medium text-green-700 mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(profitAllTime)}</p>
            <p className="text-xs text-green-600 mt-0.5">
              {revenueAllTime > 0 ? `${Math.round((profitAllTime / revenueAllTime) * 100)}% margin` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Driver Costs</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(costAllTime)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total paid to drivers</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Jobs Without Client Price</p>
            <p className="text-2xl font-bold text-gray-900">{completedJobs.filter(j => !(j as any).client_price).length}</p>
            <p className="text-xs text-orange-500 mt-0.5">Add client prices for accurate P&L</p>
          </div>
        </div>
      )}

      {/* Revenue Chart + Top Earners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Monthly bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Revenue — Last 6 Months
          </h2>
          {completedJobs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No completed jobs yet</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Revenue</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Profit</span>
              </div>
              <div className="flex items-end gap-2 h-32">
                {monthlyRevenue.map(({ label, total, profit: p }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    {total > 0 && <span className="text-xs text-gray-500 font-medium">{formatCurrency(total)}</span>}
                    <div className="w-full flex gap-0.5 items-end" style={{ height: `${Math.max((total / maxMonthly) * 80, total > 0 ? 4 : 0)}px` }}>
                      <div className="flex-1 h-full rounded-tl-md bg-blue-500 opacity-80" />
                      {p > 0 && <div className="flex-1 rounded-tr-md bg-green-500" style={{ height: `${Math.max((p / total) * 100, 8)}%` }} />}
                    </div>
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top earners */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-green-500" /> Top Earners
          </h2>
          {topEarners.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No completed jobs yet</p>
          ) : (
            <div className="space-y-3">
              {topEarners.map((e, i) => (
                <div key={e.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.name}</p>
                      <p className="text-xs text-gray-400">{e.jobs} job{e.jobs !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Fleet Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Car className="w-4 h-4" /> Fleet Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available</span>
              <Badge className="bg-green-100 text-green-800">{availableVehicles}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">On Job</span>
              <Badge className="bg-blue-100 text-blue-800">{vehiclesOnJob}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Off Road</span>
              <Badge className="bg-red-100 text-red-800">{vehiclesOffRoad}</Badge>
            </div>
          </div>
        </div>

        {/* Driver Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Driver Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Available</span>
              <Badge className="bg-green-100 text-green-800">{availableDrivers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">On Job</span>
              <Badge className="bg-blue-100 text-blue-800">{driversOnJob}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Offline</span>
              <Badge className="bg-gray-100 text-gray-600">{totalDrivers - availableDrivers - driversOnJob}</Badge>
            </div>
          </div>
        </div>

        {/* Job Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Jobs Today
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <Badge className="bg-yellow-100 text-yellow-800">{pendingJobs}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">In Progress</span>
              <Badge className="bg-purple-100 text-purple-800">{activeJobs}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed Today</span>
              <Badge className="bg-green-100 text-green-800">{completedToday}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Alerts */}
      {allAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Compliance Alerts
            <Badge className="bg-orange-100 text-orange-800 ml-1">{allAlerts.length}</Badge>
          </h2>
          <div className="space-y-2">
            {allAlerts.slice(0, 8).map((alert, i) => (
              <div
                key={`${alert.vehicleId}-${alert.alertType}-${i}`}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-lg border text-sm gap-1 ${alertSeverityColor(alert.daysUntilDue)}`}
              >
                <span className="font-medium">
                  {alert.registration} — {alert.make} {alert.model}
                </span>
                <span>
                  {alertTypeLabel(alert.alertType)}: {
                    alert.daysUntilDue < 0
                      ? `${Math.abs(alert.daysUntilDue)} days overdue`
                      : alert.daysUntilDue === 0
                        ? 'Due today'
                        : `${alert.daysUntilDue} days`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Recent Jobs
        </h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No jobs yet. Create your first job.</p>
        ) : (
          <div className="space-y-2">
            {recentJobs.map(job => (
              <div key={job.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{job.pickup_address} → {job.dropoff_address}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(job.job_date)} at {job.job_time}</p>
                </div>
                <Badge className={
                  job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  job.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  job.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                }>
                  {job.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
