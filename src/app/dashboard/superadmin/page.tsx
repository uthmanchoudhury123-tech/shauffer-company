import { createAdminClient } from '@/lib/supabase/admin'
import { Building2, Users, Briefcase, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import type { SuperAdminStats } from '@/types'

export default async function SuperAdminPage() {
  const supabase = createAdminClient()

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalCompanies },
    { count: suspendedCompanies },
    { count: totalDrivers },
    { count: totalJobs },
    { count: jobsToday },
    { count: newCompaniesThisWeek },
    { data: recentCompanies },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    supabase.from('drivers').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('job_date', today),
    supabase.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('companies').select('id, name, is_suspended, is_active, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const stats: SuperAdminStats = {
    totalCompanies: totalCompanies ?? 0,
    activeCompanies: (totalCompanies ?? 0) - (suspendedCompanies ?? 0),
    suspendedCompanies: suspendedCompanies ?? 0,
    totalDrivers: totalDrivers ?? 0,
    totalJobs: totalJobs ?? 0,
    jobsToday: jobsToday ?? 0,
    newCompaniesThisWeek: newCompaniesThisWeek ?? 0,
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time stats across all companies</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Companies"
          value={stats.totalCompanies}
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
          sub={`${stats.newCompaniesThisWeek} new this week`}
        />
        <StatCard
          label="Total Drivers"
          value={stats.totalDrivers}
          icon={<Users className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
        />
        <StatCard
          label="Total Jobs"
          value={stats.totalJobs}
          icon={<Briefcase className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
          sub={`${stats.jobsToday} today`}
        />
        <StatCard
          label="Suspended"
          value={stats.suspendedCompanies}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          bg="bg-red-50"
          highlight={stats.suspendedCompanies > 0}
        />
      </div>

      {/* Company health bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Company Health</h2>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: stats.totalCompanies > 0 ? `${(stats.activeCompanies / stats.totalCompanies) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {stats.activeCompanies} / {stats.totalCompanies} active
          </span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            Active: {stats.activeCompanies}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            Suspended: {stats.suspendedCompanies}
          </span>
        </div>
      </div>

      {/* Recent Companies */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Companies</h2>
          <a href="/dashboard/superadmin/companies" className="text-xs text-blue-600 hover:underline">
            View all →
          </a>
        </div>
        <div className="divide-y divide-gray-50">
          {(recentCompanies ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No companies yet</p>
          ) : (
            (recentCompanies ?? []).map(company => (
              <div key={company.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{company.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(company.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  company.is_suspended
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {company.is_suspended
                    ? <><AlertTriangle className="w-3 h-3" /> Suspended</>
                    : <><CheckCircle className="w-3 h-3" /> Active</>
                  }
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, bg, sub, highlight
}: {
  label: string
  value: number
  icon: React.ReactNode
  bg: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border ${highlight ? 'border-red-200' : 'border-gray-200'} p-4`}>
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${highlight && value > 0 ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
