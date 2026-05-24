'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Briefcase, Search, MapPin, Clock, UserCheck,
  ArrowRight, ChevronDown, ChevronUp, X, Repeat,
  Building2, Globe, User2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { jobStatusColor, carTypeLabel, formatDate, formatCurrency } from '@/lib/utils'
import type { Job, JobStatus, CarType } from '@/types'

const CAR_TYPES: CarType[] = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']

interface DriverOption {
  id: string
  full_name: string
  availability_status: string
  car_type: CarType
}

interface JobsClientProps {
  jobs: Job[]
  drivers: DriverOption[]
  companyId: string
  createdBy: string
}

interface DriverSearchResult {
  id: string
  full_name: string
  car_type: string
  driver_category: string
  company_name: string | null
}

const emptyForm = {
  route_legs: ['', ''] as string[],
  job_date: new Date().toISOString().split('T')[0],
  job_time: '09:00',
  end_time: '',
  job_type: 'standard' as 'standard' | 'daily',
  hours_per_day: '',
  number_of_days: '',
  price: '',
  preferred_car_type: '' as CarType | '',
  preferred_car_model: '',
  notes: '',
  driver_id: '',
  open_for_applications: false,
  visibility: 'company' as 'company' | 'platform' | 'direct',
  target_drivers: [] as DriverSearchResult[],
}

function getLegs(job: Job): { from: string; to: string }[] {
  const stops = job.route_legs && job.route_legs.length >= 2
    ? job.route_legs
    : [job.pickup_address, job.dropoff_address]
  const legs: { from: string; to: string }[] = []
  for (let i = 0; i < stops.length - 1; i++) {
    legs.push({ from: stops[i], to: stops[i + 1] })
  }
  return legs
}

export function JobsClient({ jobs: initial, drivers, companyId, createdBy }: JobsClientProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Driver search for direct targeting
  const [driverSearchQ, setDriverSearchQ] = useState('')
  const [driverSearchResults, setDriverSearchResults] = useState<DriverSearchResult[]>([])
  const [searchingDrivers, setSearchingDrivers] = useState(false)

  async function searchDrivers(q: string) {
    setDriverSearchQ(q)
    if (q.length < 2) { setDriverSearchResults([]); return }
    setSearchingDrivers(true)
    const res = await fetch(`/api/drivers/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setDriverSearchResults(data)
    setSearchingDrivers(false)
  }

  function addTargetDriver(d: DriverSearchResult) {
    if (form.target_drivers.find(t => t.id === d.id)) return
    setForm(f => ({ ...f, target_drivers: [...f.target_drivers, d] }))
    setDriverSearchQ('')
    setDriverSearchResults([])
  }

  function removeTargetDriver(id: string) {
    setForm(f => ({ ...f, target_drivers: f.target_drivers.filter(d => d.id !== id) }))
  }

  // Assign modal
  const [assignModal, setAssignModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [assignDriverId, setAssignDriverId] = useState('')

  // Applications modal
  const [applicationsModal, setApplicationsModal] = useState(false)
  const [applicationsJob, setApplicationsJob] = useState<Job | null>(null)
  const [jobApplications, setJobApplications] = useState<{
    id: string; driver_id: string; status: string; message: string | null;
    vehicle_id: string | null; created_at: string; driver_name?: string
  }[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  const filtered = jobs.filter(j => {
    const matchSearch =
      j.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      j.dropoff_address.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  // --- Route legs helpers ---
  function updateLeg(idx: number, value: string) {
    setForm(f => {
      const legs = [...f.route_legs]
      legs[idx] = value
      return { ...f, route_legs: legs }
    })
  }
  function addLeg() {
    setForm(f => ({ ...f, route_legs: [...f.route_legs, ''] }))
  }
  function removeLeg(idx: number) {
    setForm(f => {
      if (f.route_legs.length <= 2) return f
      const legs = f.route_legs.filter((_, i) => i !== idx)
      return { ...f, route_legs: legs }
    })
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const stops = form.route_legs.map(s => s.trim()).filter(Boolean)
    if (stops.length < 2) {
      setError('Please fill in at least a pickup and drop-off address.')
      setSaving(false)
      return
    }

    const isDirected = form.visibility === 'direct'
    const payload = {
      company_id: companyId,
      created_by: createdBy,
      pickup_address: stops[0],
      dropoff_address: stops[stops.length - 1],
      route_legs: stops,
      job_date: form.job_date,
      job_time: form.job_time,
      end_time: form.end_time || null,
      job_type: form.job_type,
      hours_per_day: form.job_type === 'daily' && form.hours_per_day ? Number(form.hours_per_day) : null,
      number_of_days: form.job_type === 'daily' && form.number_of_days ? Number(form.number_of_days) : null,
      price: Number(form.price) || 0,
      preferred_car_type: form.preferred_car_type || null,
      preferred_car_model: form.preferred_car_model || null,
      notes: form.notes || null,
      status: (form.driver_id ? 'assigned' : 'pending') as JobStatus,
      driver_id: form.driver_id || null,
      open_for_applications: isDirected ? false : (form.driver_id ? false : form.open_for_applications),
      visibility: form.visibility,
      target_driver_ids: isDirected ? form.target_drivers.map(d => d.id) : [],
    }

    const { data, error: err } = await supabase
      .from('jobs')
      .insert(payload)
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    setJobs(prev => [data, ...prev])

    if (form.driver_id) {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: form.driver_id,
          title: 'New Job Assigned',
          body: `${stops[0]} → ${stops[stops.length - 1]}`,
          url: '/dashboard/driver/jobs',
        }),
      }).catch(() => {})
    }

    setSaving(false)
    setModalOpen(false)
    setForm(emptyForm)
    router.refresh()
  }

  async function handleAssign() {
    if (!selectedJob || !assignDriverId) return
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('jobs')
      .update({ driver_id: assignDriverId, status: 'assigned' })
      .eq('id', selectedJob.id)
      .select()
      .single()

    if (!err && data) {
      setJobs(prev => prev.map(j => j.id === selectedJob.id ? data : j))
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: assignDriverId,
          title: 'New Job Assigned',
          body: `${selectedJob.pickup_address} → ${selectedJob.dropoff_address}`,
          url: '/dashboard/driver/jobs',
        }),
      }).catch(() => {})
    }
    setAssignModal(false)
    setSelectedJob(null)
  }

  async function updateStatus(jobId: string, status: JobStatus) {
    const supabase = createClient()
    const { data } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId)
      .select()
      .single()
    if (data) setJobs(prev => prev.map(j => j.id === jobId ? data : j))
  }

  async function viewApplications(job: Job) {
    setApplicationsJob(job)
    setApplicationsModal(true)
    setLoadingApps(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true })
    const enriched = await Promise.all((data ?? []).map(async (app) => {
      const { data: d } = await supabase.from('drivers').select('full_name').eq('id', app.driver_id).single()
      return { ...app, driver_name: d?.full_name }
    }))
    setJobApplications(enriched)
    setLoadingApps(false)
  }

  async function acceptApplication(appId: string, driverId: string, jobId: string) {
    const supabase = createClient()
    await supabase.from('job_applications').update({ status: 'accepted' }).eq('id', appId)
    await supabase.from('job_applications').update({ status: 'rejected' }).eq('job_id', jobId).neq('id', appId)
    const { data } = await supabase
      .from('jobs')
      .update({ driver_id: driverId, status: 'assigned', open_for_applications: false })
      .eq('id', jobId)
      .select()
      .single()
    if (data) setJobs(prev => prev.map(j => j.id === jobId ? data : j))
    setJobApplications(prev => prev.map(a => ({ ...a, status: a.id === appId ? 'accepted' : 'rejected' })))
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, title: 'Job Application Accepted!', body: 'You have been assigned a job.', url: '/dashboard/driver' }),
    }).catch(() => {})
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setError(''); setModalOpen(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                     text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as JobStatus | 'all')}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Jobs List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No jobs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const driver = drivers.find(d => d.id === job.driver_id)
            const legs = getLegs(job)
            const isMultiLeg = legs.length > 1
            const isExpanded = expandedJob === job.id
            const isDaily = job.job_type === 'daily'

            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Route — first leg always visible */}
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="font-medium text-gray-800 truncate">{legs[0].from}</span>
                        </div>
                        {isMultiLeg ? (
                          <div className="flex items-center gap-1.5 ml-4">
                            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                              <Repeat className="w-3 h-3" />
                              {legs.length} leg{legs.length !== 1 ? 's' : ''}
                            </div>
                            <button
                              onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExpanded ? 'Hide' : 'Show all'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-gray-600 truncate">{legs[0].to}</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded legs */}
                      {isMultiLeg && isExpanded && (
                        <div className="mt-2 ml-1 space-y-1">
                          {legs.map((leg, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-semibold flex items-center justify-center flex-shrink-0 text-[10px]">{i + 1}</span>
                              <span className="truncate">{leg.from}</span>
                              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{leg.to}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(job.job_date)} {job.job_time}
                          {job.end_time && <span>– {job.end_time}</span>}
                        </span>
                        {isDaily && (
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                            Daily{job.hours_per_day ? ` · ${job.hours_per_day}h/day` : ''}{job.number_of_days ? ` · ${job.number_of_days} day${job.number_of_days !== 1 ? 's' : ''}` : ''}
                          </span>
                        )}
                        <span className="font-semibold text-gray-700">{formatCurrency(job.price)}</span>
                        {job.preferred_car_model && (
                          <span className="text-gray-500 italic">{job.preferred_car_model}</span>
                        )}
                        {job.preferred_car_type && !job.preferred_car_model && (
                          <span>{carTypeLabel(job.preferred_car_type)}</span>
                        )}
                      </div>

                      {driver && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                          <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Assigned to <strong className="text-gray-700">{driver.full_name}</strong></span>
                        </div>
                      )}

                      {job.notes && (
                        <p className="mt-1.5 text-xs text-gray-400 italic">{job.notes}</p>
                      )}
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 flex-shrink-0 flex-wrap">
                      <Badge className={jobStatusColor(job.status)}>
                        {job.status.replace('_', ' ')}
                      </Badge>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(job as any).open_for_applications && (
                          <button
                            onClick={() => viewApplications(job)}
                            className="text-xs px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors font-medium"
                          >
                            View Applications
                          </button>
                        )}
                        {(job.status === 'pending' || job.status === 'assigned') && !(job as any).open_for_applications && (
                          <button
                            onClick={() => { setSelectedJob(job); setAssignDriverId(job.driver_id ?? ''); setAssignModal(true) }}
                            className="text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                          >
                            {job.driver_id ? 'Reassign' : 'Assign Driver'}
                          </button>
                        )}
                        {job.status === 'assigned' && (
                          <button
                            onClick={() => updateStatus(job.id, 'in_progress')}
                            className="text-xs px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button
                            onClick={() => updateStatus(job.id, 'completed')}
                            className="text-xs px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {(job.status === 'pending' || job.status === 'assigned') && (
                          <button
                            onClick={() => updateStatus(job.id, 'cancelled')}
                            className="text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Create Job Modal ─── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Job" size="lg">
        <div className="space-y-4">

          {/* Job Type Toggle */}
          <div className="flex gap-2">
            {(['standard', 'daily'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, job_type: t }))}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.job_type === t
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t === 'standard' ? '📍 Standard Job' : '📅 Daily Hire'}
              </button>
            ))}
          </div>

          {/* Route builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Route *</label>
              <span className="text-xs text-gray-400">{form.route_legs.length - 1} leg{form.route_legs.length - 1 !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {form.route_legs.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-0.5 w-5 flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      idx === 0 ? 'border-green-500 bg-green-500' :
                      idx === form.route_legs.length - 1 ? 'border-red-500 bg-red-500' :
                      'border-blue-400 bg-blue-400'
                    }`} />
                    {idx < form.route_legs.length - 1 && (
                      <div className="w-0.5 h-4 bg-gray-200" />
                    )}
                  </div>
                  <input
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={stop}
                    onChange={e => updateLeg(idx, e.target.value)}
                    placeholder={
                      idx === 0 ? 'Pickup address...' :
                      idx === form.route_legs.length - 1 ? 'Drop-off address...' :
                      `Stop ${idx + 1}...`
                    }
                  />
                  {form.route_legs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLeg(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLeg}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Leg
            </button>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.job_date}
                onChange={e => setForm(f => ({ ...f, job_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.job_time}
                onChange={e => setForm(f => ({ ...f, job_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Daily hire fields */}
          {form.job_type === 'daily' && (
            <div className="grid grid-cols-2 gap-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1">Hours per day</label>
                <input
                  type="number" min="1" max="24" step="0.5"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  value={form.hours_per_day}
                  onChange={e => setForm(f => ({ ...f, hours_per_day: e.target.value }))}
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1">Number of days</label>
                <input
                  type="number" min="1"
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  value={form.number_of_days}
                  onChange={e => setForm(f => ({ ...f, number_of_days: e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          )}

          {/* Price & Preferred Car */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price (£)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Car Category</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.preferred_car_type}
                onChange={e => setForm(f => ({ ...f, preferred_car_type: e.target.value as CarType }))}
              >
                <option value="">Any</option>
                {CAR_TYPES.map(t => <option key={t} value={t}>{carTypeLabel(t)}</option>)}
              </select>
            </div>
          </div>

          {/* Specific car model */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Preferred Car Model <span className="text-gray-400">(optional, e.g. Mercedes S Class, BMW 7 Series)</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.preferred_car_model}
              onChange={e => setForm(f => ({ ...f, preferred_car_model: e.target.value }))}
              placeholder="e.g. Mercedes S Class W223, V Class..."
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Who can see this job?</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'company',  icon: Building2, label: 'Company Only',   desc: 'Your drivers' },
                { key: 'platform', icon: Globe,     label: 'All Drivers',    desc: 'Incl. freelancers' },
                { key: 'direct',   icon: User2,     label: 'Specific Driver', desc: 'Pick by name' },
              ] as const).map(({ key, icon: Icon, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, visibility: key, target_drivers: [], open_for_applications: key !== 'direct' ? f.open_for_applications : false }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors ${
                    form.visibility === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{label}</span>
                  <span className="text-gray-400">{desc}</span>
                </button>
              ))}
            </div>

            {/* Direct targeting: driver search */}
            {form.visibility === 'direct' && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search driver by name..."
                    value={driverSearchQ}
                    onChange={e => searchDrivers(e.target.value)}
                  />
                  {searchingDrivers && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
                  )}
                </div>

                {driverSearchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {driverSearchResults.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => addTargetDriver(d)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-800">{d.full_name}</span>
                        <span className="text-xs text-gray-400">{d.company_name ?? 'Freelancer'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {form.target_drivers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.target_drivers.map(d => (
                      <span key={d.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                        {d.full_name}
                        <button type="button" onClick={() => removeTargetDriver(d.id)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {form.target_drivers.length === 0 && (
                  <p className="text-xs text-amber-600">Search and add at least one driver to target</p>
                )}
              </div>
            )}
          </div>

          {/* Open for applications toggle */}
          {form.visibility !== 'direct' && (
          <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <p className="text-sm font-medium text-blue-900">Open for Driver Applications</p>
              <p className="text-xs text-blue-600 mt-0.5">Drivers with matching vehicles can apply for this job</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({
                ...f,
                open_for_applications: !f.open_for_applications,
                driver_id: f.open_for_applications ? f.driver_id : '',
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.open_for_applications ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                form.open_for_applications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          )} {/* end visibility !== direct */}

          {/* Assign driver */}
          {form.visibility !== 'direct' && !form.open_for_applications && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assign Driver (optional)</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.driver_id}
                onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.availability_status.replace('_', ' ')}) — {carTypeLabel(d.car_type)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Special instructions, client name, flight number..."
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || form.route_legs.filter(s => s.trim()).length < 2 || (form.visibility === 'direct' && form.target_drivers.length === 0)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Assign Driver Modal ─── */}
      <Modal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        title={selectedJob?.driver_id ? 'Reassign Driver' : 'Assign Driver'}
        size="sm"
      >
        <div className="space-y-4">
          {selectedJob && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-gray-700">{selectedJob.pickup_address}</p>
              <p className="text-gray-400 text-xs mt-0.5">→ {selectedJob.dropoff_address}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Select Driver</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {drivers.map(d => (
                <button
                  key={d.id}
                  onClick={() => setAssignDriverId(d.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    assignDriverId === d.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-800">{d.full_name}</span>
                  <span className={`ml-2 text-xs ${
                    d.availability_status === 'available' ? 'text-green-600' :
                    d.availability_status === 'on_job' ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    ({d.availability_status.replace('_', ' ')})
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAssignModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!assignDriverId}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              Assign
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Applications Modal ─── */}
      <Modal isOpen={applicationsModal} onClose={() => setApplicationsModal(false)} title="Driver Applications" size="md">
        <div>
          {applicationsJob && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm mb-4">
              <p className="font-medium text-gray-700">{applicationsJob.pickup_address} → {applicationsJob.dropoff_address}</p>
              <p className="text-gray-400 text-xs mt-0.5">{applicationsJob.job_date} at {applicationsJob.job_time}</p>
            </div>
          )}
          {loadingApps ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading applications...</p>
          ) : jobApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No applications yet</p>
              <p className="text-xs text-gray-300 mt-1">Drivers with matching vehicles will apply here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobApplications.map(app => (
                <div key={app.id} className={`p-4 rounded-xl border ${
                  app.status === 'accepted' ? 'border-green-200 bg-green-50' :
                  app.status === 'rejected' ? 'border-gray-100 bg-gray-50 opacity-60' :
                  'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{app.driver_name ?? 'Unknown Driver'}</p>
                      {app.message && <p className="text-xs text-gray-500 mt-0.5 italic">"{app.message}"</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {app.status === 'pending' && (
                        <button
                          onClick={() => acceptApplication(app.id, app.driver_id, applicationsJob!.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                        >
                          Accept
                        </button>
                      )}
                      {app.status === 'accepted' && (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">✓ Accepted</span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="text-xs text-gray-400">Rejected</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
