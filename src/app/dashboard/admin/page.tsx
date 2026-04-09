import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import {
  Car, Users, Briefcase, AlertTriangle,
  CheckCircle2, Clock, TrendingUp
} from 'lucide-react'
import { formatDate, alertTypeLabel, alertSeverityColor } from '@/lib/utils'
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
  const pendingJobs = jobs?.filter(j => j.status === 'pending').length ?? 0
  const activeJobs = jobs?.filter(j => j.status === 'in_progress').length ?? 0
  const completedToday = jobs?.filter(j => j.status === 'completed' && j.job_date === today).length ?? 0

  // Compliance alerts
  const allAlerts = (vehicles as Vehicle[] ?? []).flatMap(v => getComplianceAlerts(v))
  const criticalAlerts = allAlerts.filter(a => a.daysUntilDue <= 7)

  // Recent jobs (last 5)
  const recentJobs = (jobs ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="p-6 max-w-7xl">
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
                className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${alertSeverityColor(alert.daysUntilDue)}`}
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
              <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{job.pickup_address} → {job.dropoff_address}</p>
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
