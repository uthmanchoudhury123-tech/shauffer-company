'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Briefcase, Search, MapPin, Clock, UserCheck } from 'lucide-react'
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

const emptyForm = {
  pickup_address: '',
  dropoff_address: '',
  job_date: new Date().toISOString().split('T')[0],
  job_time: '09:00',
  price: '',
  preferred_car_type: '' as CarType | '',
  notes: '',
  driver_id: '',
  open_for_applications: false,
}

export function JobsClient({ jobs: initial, drivers, companyId, createdBy }: JobsClientProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Assign modal
  const [assignModal, setAssignModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [assignDriverId, setAssignDriverId] = useState('')
  // Applications
  const [applicationsModal, setApplicationsModal] = useState(false)
  const [applicationsJob, setApplicationsJob] = useState<Job | null>(null)
  const [jobApplications, setJobApplications] = useState<{id:string,driver_id:string,status:string,message:string|null,vehicle_id:string|null,created_at:string,driver_name?:string}[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  const filtered = jobs.filter(j => {
    const matchSearch =
      j.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      j.dropoff_address.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleCreate() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      company_id: companyId,
      created_by: createdBy,
      pickup_address: form.pickup_address,
      dropoff_address: form.dropoff_address,
      job_date: form.job_date,
      job_time: form.job_time,
      price: Number(form.price) || 0,
      preferred_car_type: form.preferred_car_type || null,
      notes: form.notes || null,
      status: form.driver_id ? 'assigned' : 'pending' as JobStatus,
      driver_id: form.driver_id || null,
      open_for_applications: form.driver_id ? false : form.open_for_applications,
    }

    const { data, error: err } = await supabase
      .from('jobs')
      .insert(payload)
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    setJobs(prev => [data, ...prev])

    // Notify driver if assigned at creation
    if (form.driver_id) {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: form.driver_id,
          title: 'New Job Assigned',
          body: `${form.pickup_address} → ${form.dropoff_address}`,
          url: '/dashboard/driver/jobs',
        }),
      }).catch(() => {/* best-effort */})
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

      // Fire push notification to the assigned driver
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: assignDriverId,
          title: 'New Job Assigned',
          body: `${selectedJob.pickup_address} → ${selectedJob.dropoff_address}`,
          url: '/dashboard/driver/jobs',
        }),
      }).catch(() => {/* notifications are best-effort */})
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
    // Enrich with driver name
    const enriched = await Promise.all((data ?? []).map(async (app) => {
      const { data: d } = await supabase.from('drivers').select('full_name').eq('id', app.driver_id).single()
      return { ...app, driver_name: d?.full_name }
    }))
    setJobApplications(enriched)
    setLoadingApps(false)
  }

  async function acceptApplication(appId: string, driverId: string, jobId: string) {
    const supabase = createClient()
    // Accept this application
    await supabase.from('job_applications').update({ status: 'accepted' }).eq('id', appId)
    // Reject all others for this job
    await supabase.from('job_applications').update({ status: 'rejected' }).eq('job_id', jobId).neq('id', appId)
    // Assign driver to job + close applications
    const { data } = await supabase
      .from('jobs')
      .update({ driver_id: driverId, status: 'assigned', open_for_applications: false })
      .eq('id', jobId)
      .select()
      .single()
    if (data) setJobs(prev => prev.map(j => j.id === jobId ? data : j))
    setJobApplications(prev => prev.map(a => ({ ...a, status: a.id === appId ? 'accepted' : 'rejected' })))
    // Push notification
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, title: 'Job Application Accepted!', body: 'You have been assigned a job.', url: '/dashboard/driver' }),
    }).catch(() => {})
  }

  const availableDrivers = drivers.filter(d => d.availability_status === 'available')

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
            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Route */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{job.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-gray-600 truncate">{job.dropoff_address}</span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(job.job_date)} at {job.job_time}
                      </span>
                      <span className="font-semibold text-gray-700">{formatCurrency(job.price)}</span>
                      {job.preferred_car_type && (
                        <span>{carTypeLabel(job.preferred_car_type)}</span>
                      )}
                    </div>

                    {/* Driver */}
                    {driver && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span>Assigned to <strong className="text-gray-700">{driver.full_name}</strong></span>
                      </div>
                    )}

                    {/* Notes */}
                    {job.notes && (
                      <p className="mt-1.5 text-xs text-gray-400 italic">{job.notes}</p>
                    )}
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 flex-shrink-0 flex-wrap">
                    <Badge className={jobStatusColor(job.status)}>
                      {job.status.replace('_', ' ')}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {/* Applications button */}
                      {(job as any).open_for_applications && (
                        <button
                          onClick={() => viewApplications(job)}
                          className="text-xs px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors font-medium"
                        >
                          View Applications
                        </button>
                      )}
                      {/* Assign driver button */}
                      {(job.status === 'pending' || job.status === 'assigned') && !(job as any).open_for_applications && (
                        <button
                          onClick={() => { setSelectedJob(job); setAssignDriverId(job.driver_id ?? ''); setAssignModal(true) }}
                          className="text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                        >
                          {job.driver_id ? 'Reassign' : 'Assign Driver'}
                        </button>
                      )}

                      {/* Status transitions */}
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
            )
          })}
        </div>
      )}

      {/* Create Job Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Job" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pickup Address *</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.pickup_address}
              onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))}
              placeholder="e.g. Heathrow Airport, Terminal 5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Drop-off Address *</label>
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dropoff_address}
              onChange={e => setForm(f => ({ ...f, dropoff_address: e.target.value }))}
              placeholder="e.g. 10 Downing Street, London"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Time *</label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.job_time}
                onChange={e => setForm(f => ({ ...f, job_time: e.target.value }))}
              />
            </div>
          </div>

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
              <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Car Type</label>
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

          {/* Open for applications toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <p className="text-sm font-medium text-blue-900">Open for Driver Applications</p>
              <p className="text-xs text-blue-600 mt-0.5">Drivers with matching vehicles can apply for this job</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, open_for_applications: !f.open_for_applications, driver_id: f.open_for_applications ? f.driver_id : '' }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.open_for_applications ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.open_for_applications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Assign driver at creation */}
          {!form.open_for_applications && <div>
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
          </div>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any special instructions..."
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
              disabled={saving || !form.pickup_address || !form.dropoff_address}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Driver Modal */}
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
                    assignDriverId === d.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
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

      {/* Applications Modal */}
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
