'use client'

import { useState } from 'react'
import { PoundSterling, TrendingUp, Briefcase, Calendar, MapPin } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CompletedJob {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  price: number
  status: string
}

interface EarningsClientProps {
  jobs: CompletedJob[]
  role: 'driver' | 'freelancer'
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

export function EarningsClient({ jobs }: EarningsClientProps) {
  const [period, setPeriod] = useState<Period>('month')

  const today     = new Date().toISOString().split('T')[0]
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const yearStart  = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  function filterByPeriod(p: Period) {
    switch (p) {
      case 'today': return jobs.filter(j => j.job_date === today)
      case 'week':  return jobs.filter(j => j.job_date >= weekStart)
      case 'month': return jobs.filter(j => j.job_date >= monthStart)
      case 'year':  return jobs.filter(j => j.job_date >= yearStart)
      default:      return jobs
    }
  }

  const filtered = filterByPeriod(period)
  const total = filtered.reduce((s, j) => s + (j.price ?? 0), 0)

  // Summary cards always show all-time + period comparison
  const allTimeTotal = jobs.reduce((s, j) => s + (j.price ?? 0), 0)
  const monthTotal   = jobs.filter(j => j.job_date >= monthStart).reduce((s, j) => s + (j.price ?? 0), 0)
  const weekTotal    = jobs.filter(j => j.job_date >= weekStart).reduce((s, j) => s + (j.price ?? 0), 0)
  const todayTotal   = jobs.filter(j => j.job_date === today).reduce((s, j) => s + (j.price ?? 0), 0)

  // Last 6 months bar chart
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const amount = jobs.filter(j => j.job_date >= ms && j.job_date <= me).reduce((s, j) => s + (j.price ?? 0), 0)
    const count  = jobs.filter(j => j.job_date >= ms && j.job_date <= me).length
    return { label, amount, count }
  })
  const maxBar = Math.max(...monthlyData.map(m => m.amount), 1)

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year',  label: 'This Year' },
    { key: 'all',   label: 'All Time' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue from all your completed jobs</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today",       value: todayTotal,   sub: `${jobs.filter(j=>j.job_date===today).length} jobs` },
          { label: "This Week",   value: weekTotal,    sub: `${jobs.filter(j=>j.job_date>=weekStart).length} jobs` },
          { label: "This Month",  value: monthTotal,   sub: `${jobs.filter(j=>j.job_date>=monthStart).length} jobs` },
          { label: "All Time",    value: allTimeTotal, sub: `${jobs.length} completed` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">{label}</span>
              <PoundSterling className="w-3.5 h-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" /> Monthly Earnings
        </h2>
        {allTimeTotal === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No completed jobs yet — earnings will appear here</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {monthlyData.map(({ label, amount, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                {amount > 0 && (
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    {formatCurrency(amount)}
                  </span>
                )}
                <div
                  className="w-full rounded-t-md bg-blue-100 relative overflow-hidden"
                  style={{ height: `${Math.max((amount / maxBar) * 96, amount > 0 ? 6 : 2)}px` }}
                >
                  <div className="absolute inset-0 bg-blue-500 opacity-75 rounded-t-md" />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
                {count > 0 && <span className="text-xs text-gray-300">{count}j</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job history with period filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Job History
            <span className="text-gray-400 font-normal">({filtered.length} jobs · {formatCurrency(total)})</span>
          </h2>
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No completed jobs in this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => (
              <div key={job.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm text-gray-800">
                    <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="truncate font-medium">{job.pickup_address}</span>
                    <span className="text-gray-400 flex-shrink-0">→</span>
                    <span className="truncate text-gray-600">{job.dropoff_address}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-5">
                    {formatDate(job.job_date)} at {job.job_time}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600 flex-shrink-0">
                  {formatCurrency(job.price)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
