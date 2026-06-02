'use client'

import { useState } from 'react'
import { PoundSterling, TrendingUp, Briefcase, Calendar, MapPin, Plus, X, Banknote, CreditCard, MoreHorizontal } from 'lucide-react'
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

interface ManualEarning {
  id: string
  amount: number
  description: string | null
  source: 'cash' | 'bank_transfer' | 'other'
  job_date: string
  created_at: string
}

interface EarningsClientProps {
  jobs: CompletedJob[]
  manualEarnings?: ManualEarning[]
  role: 'driver' | 'freelancer'
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all'

const SOURCE_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  bank_transfer: <CreditCard className="w-3.5 h-3.5" />,
  other: <MoreHorizontal className="w-3.5 h-3.5" />,
}

export function EarningsClient({ jobs, manualEarnings: initialManual = [], role }: EarningsClientProps) {
  const [period, setPeriod] = useState<Period>('month')
  const [manualEarnings, setManualEarnings] = useState<ManualEarning[]>(initialManual)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ amount: '', description: '', source: 'cash', job_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [activeTab, setActiveTab] = useState<'jobs' | 'manual'>('jobs')

  const today     = new Date().toISOString().split('T')[0]
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const yearStart  = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  function filterByPeriod<T extends { job_date: string }>(items: T[], p: Period) {
    switch (p) {
      case 'today': return items.filter(j => j.job_date === today)
      case 'week':  return items.filter(j => j.job_date >= weekStart)
      case 'month': return items.filter(j => j.job_date >= monthStart)
      case 'year':  return items.filter(j => j.job_date >= yearStart)
      default:      return items
    }
  }

  const filteredJobs   = filterByPeriod(jobs, period)
  const filteredManual = filterByPeriod(manualEarnings, period)

  const jobTotal    = filteredJobs.reduce((s, j) => s + (j.price ?? 0), 0)
  const manualTotal = filteredManual.reduce((s, m) => s + (m.amount ?? 0), 0)
  const total       = jobTotal + manualTotal

  const allJobTotal    = jobs.reduce((s, j) => s + (j.price ?? 0), 0)
  const allManualTotal = manualEarnings.reduce((s, m) => s + (m.amount ?? 0), 0)

  const monthJobs    = jobs.filter(j => j.job_date >= monthStart).reduce((s, j) => s + (j.price ?? 0), 0)
  const monthManual  = manualEarnings.filter(m => m.job_date >= monthStart).reduce((s, m) => s + (m.amount ?? 0), 0)
  const weekJobs     = jobs.filter(j => j.job_date >= weekStart).reduce((s, j) => s + (j.price ?? 0), 0)
  const weekManual   = manualEarnings.filter(m => m.job_date >= weekStart).reduce((s, m) => s + (m.amount ?? 0), 0)
  const todayJobs    = jobs.filter(j => j.job_date === today).reduce((s, j) => s + (j.price ?? 0), 0)
  const todayManual  = manualEarnings.filter(m => m.job_date === today).reduce((s, m) => s + (m.amount ?? 0), 0)

  // Last 6 months bar chart (combined)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const jobAmt    = jobs.filter(j => j.job_date >= ms && j.job_date <= me).reduce((s, j) => s + (j.price ?? 0), 0)
    const manualAmt = manualEarnings.filter(m => m.job_date >= ms && m.job_date <= me).reduce((s, m) => s + (m.amount ?? 0), 0)
    const amount = jobAmt + manualAmt
    const count  = jobs.filter(j => j.job_date >= ms && j.job_date <= me).length + manualEarnings.filter(m => m.job_date >= ms && m.job_date <= me).length
    return { label, amount, jobAmt, manualAmt, count }
  })
  const maxBar = Math.max(...monthlyData.map(m => m.amount), 1)

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year',  label: 'This Year' },
    { key: 'all',   label: 'All Time' },
  ]

  async function handleAddManual() {
    if (!addForm.amount || Number(addForm.amount) <= 0) {
      setSaveError('Please enter a valid amount')
      return
    }
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/earnings/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const json = await res.json()
    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    setManualEarnings(prev => [json.data, ...prev])
    setAddForm({ amount: '', description: '', source: 'cash', job_date: new Date().toISOString().split('T')[0] })
    setShowAddForm(false)
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue from all your completed work</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setSaveError('') }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Earnings
        </button>
      </div>

      {/* Add manual earnings form */}
      {showAddForm && (
        <div className="mb-6 bg-white rounded-xl border border-green-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Log Manual Earnings</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (£) *</label>
              <input
                type="number" min="0" step="0.01"
                value={addForm.amount}
                onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select
                value={addForm.source}
                onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={addForm.job_date}
                onChange={e => setAddForm(f => ({ ...f, job_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
              <input
                type="text"
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Airport run, client name..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          {saveError && <p className="text-red-600 text-xs mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleAddManual}
              disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Earnings'}
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today",      value: todayJobs + todayManual,                 sub: `${jobs.filter(j=>j.job_date===today).length + manualEarnings.filter(m=>m.job_date===today).length} entries` },
          { label: "This Week",  value: weekJobs + weekManual,                   sub: `${jobs.filter(j=>j.job_date>=weekStart).length + manualEarnings.filter(m=>m.job_date>=weekStart).length} entries` },
          { label: "This Month", value: monthJobs + monthManual,                 sub: `${jobs.filter(j=>j.job_date>=monthStart).length + manualEarnings.filter(m=>m.job_date>=monthStart).length} entries` },
          { label: "All Time",   value: allJobTotal + allManualTotal,            sub: `${jobs.length + manualEarnings.length} total` },
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
          <span className="flex items-center gap-3 ml-auto text-xs font-normal text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Jobs</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />Manual</span>
          </span>
        </h2>
        {allJobTotal + allManualTotal === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No earnings yet — they will appear here</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {monthlyData.map(({ label, amount, jobAmt, manualAmt, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                {amount > 0 && (
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    {formatCurrency(amount)}
                  </span>
                )}
                <div
                  className="w-full rounded-t-md overflow-hidden"
                  style={{ height: `${Math.max((amount / maxBar) * 96, amount > 0 ? 6 : 2)}px` }}
                >
                  {/* Stacked bar: jobs (blue) + manual (green) */}
                  {amount > 0 ? (
                    <div className="w-full h-full flex flex-col-reverse">
                      <div className="bg-blue-500" style={{ flex: jobAmt }} />
                      <div className="bg-green-400" style={{ flex: manualAmt }} />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-t-md" />
                  )}
                </div>
                <span className="text-xs text-gray-500">{label}</span>
                {count > 0 && <span className="text-xs text-gray-300">{count}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History with period filter + tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            History
            <span className="text-gray-400 font-normal">({filteredJobs.length + filteredManual.length} entries · {formatCurrency(total)})</span>
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

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-100">
          {[
            { key: 'jobs' as const, label: `Jobs (${filteredJobs.length})`, amount: jobTotal },
            { key: 'manual' as const, label: `Manual (${filteredManual.length})`, amount: manualTotal },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
              {t.amount > 0 && <span className="ml-1 text-gray-400">· {formatCurrency(t.amount)}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'jobs' && (
          filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No completed jobs in this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map(job => (
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
          )
        )}

        {activeTab === 'manual' && (
          filteredManual.length === 0 ? (
            <div className="text-center py-8">
              <Banknote className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No manual earnings in this period</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Log your first entry
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredManual.map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-800">
                      <span className="text-gray-400">{SOURCE_ICONS[entry.source]}</span>
                      <span className="font-medium">{entry.description || SOURCE_LABELS[entry.source]}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {SOURCE_LABELS[entry.source]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-5">{formatDate(entry.job_date)}</p>
                  </div>
                  <span className="text-sm font-bold text-green-600 flex-shrink-0">
                    {formatCurrency(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
