'use client'

import { useState, useMemo } from 'react'
import { Search, Download, ChevronUp, ChevronDown, ChevronsUpDown, Filter } from 'lucide-react'

interface Job {
  id: string
  job_date: string
  job_time: string
  pickup_address: string
  dropoff_address: string
  status: string
  driver_id: string | null
  notes?: string
  created_at: string
}

interface Driver {
  id: string
  full_name: string
}

type SortKey = keyof Job
type SortDir = 'asc' | 'desc'

const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  assigned:    'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-red-100 text-red-800',
}

const COLUMNS = [
  { key: 'job_date',         label: 'Date',        sortable: true },
  { key: 'job_time',         label: 'Time',        sortable: true },
  { key: 'pickup_address',   label: 'Pickup',      sortable: true },
  { key: 'dropoff_address',  label: 'Drop-off',    sortable: true },
  { key: 'driver_id',        label: 'Driver',      sortable: false },
  { key: 'status',           label: 'Status',      sortable: true },
  { key: 'notes',            label: 'Notes',       sortable: false },
]

export function SpreadsheetClient({ jobs, drivers }: { jobs: Job[]; drivers: Driver[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('job_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const driverMap = useMemo(() =>
    Object.fromEntries(drivers.map(d => [d.id, d.full_name])),
    [drivers]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = [...jobs]
    if (statusFilter !== 'all') rows = rows.filter(j => j.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(j =>
        j.pickup_address?.toLowerCase().includes(q) ||
        j.dropoff_address?.toLowerCase().includes(q) ||
        j.status?.toLowerCase().includes(q) ||
        j.job_date?.includes(q) ||
        driverMap[j.driver_id ?? '']?.toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      const av = (a[sortKey] as string) ?? ''
      const bv = (b[sortKey] as string) ?? ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return rows
  }, [jobs, search, statusFilter, sortKey, sortDir, driverMap])

  function exportCSV() {
    const headers = ['Date', 'Time', 'Pickup', 'Drop-off', 'Driver', 'Status', 'Notes']
    const rows = filtered.map(j => [
      j.job_date, j.job_time, j.pickup_address, j.dropoff_address,
      driverMap[j.driver_id ?? ''] ?? 'Unassigned', j.status, j.notes ?? ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `jobs-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
  }

  return (
    <div className="p-4 sm:p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Spreadsheet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sort, filter and export all job records</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>

        <span className="text-sm text-gray-400 ml-auto">{filtered.length} row{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap
                      ${col.sortable ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                    onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center text-gray-400 py-12 text-sm">
                    No jobs found
                  </td>
                </tr>
              ) : (
                filtered.map((job, i) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.job_date}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.job_time}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-48 truncate">{job.pickup_address}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-48 truncate">{job.dropoff_address}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {driverMap[job.driver_id ?? ''] ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {job.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-48 truncate">{job.notes ?? <span className="text-gray-200">—</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
