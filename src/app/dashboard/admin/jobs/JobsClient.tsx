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
    }

    const { data, error: err } = await supabase
      .from('jobs')
      .insert(payload)
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    setJobs(prev => [data, ...prev])
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

  const availableDrivers = drivers.filter(d => d.availability_status === 'available')

  return (
    <div className="p-6 max-w-7xl">
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{job.pickup_address}</span>
                      <span className="text-gray-400 flex-shrink-0">→</span>
                      <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-gray-600 truncate">{job.dropoff_address}</span>
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
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge className={jobStatusColor(job.status)}>
                      {job.status.replace('_', ' ')}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {/* Assign driver button */}
                      {(job.status === 'pending' || job.status === 'assigned') && (
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          {/* Assign driver at creation */}
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
    </div>
  )
}
