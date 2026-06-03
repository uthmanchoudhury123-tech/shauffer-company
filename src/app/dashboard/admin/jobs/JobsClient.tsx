'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Briefcase, Search, MapPin, Clock, UserCheck,
  ArrowRight, ChevronDown, ChevronUp, X, Repeat,
  Building2, Globe, User2, MessageSquare, FileText, CreditCard, Star,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { ChatModal } from '@/components/ui/ChatModal'
import { jobStatusColor, carTypeLabel, formatDate, formatCurrency } from '@/lib/utils'
import type { Job, JobStatus, CarType } from '@/types'

const CAR_TYPES: CarType[] = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']

// Common models per car category for UK chauffeur industry
const CAR_MODELS_BY_TYPE: Partial<Record<CarType, string[]>> = {
  saloon: [
    'Mercedes-Benz C-Class', 'Mercedes-Benz E-Class',
    'BMW 3 Series', 'BMW 5 Series',
    'Audi A4', 'Audi A6',
    'Jaguar XE', 'Jaguar XF',
    'Tesla Model 3', 'Lexus ES', 'Volvo S90',
  ],
  executive: [
    'Mercedes-Benz S-Class', 'Mercedes-Benz Maybach S-Class',
    'BMW 7 Series', 'Audi A8',
    'Bentley Flying Spur', 'Rolls-Royce Ghost', 'Rolls-Royce Phantom',
    'Maserati Quattroporte', 'Jaguar XJ',
    'Lexus LS', 'Tesla Model S',
  ],
  suv: [
    'Range Rover Vogue', 'Range Rover Sport', 'Range Rover Autobiography',
    'Mercedes-Benz GLE', 'Mercedes-Benz GLS',
    'BMW X5', 'BMW X7',
    'Audi Q7', 'Audi Q8',
    'Porsche Cayenne', 'Volvo XC90',
    'Tesla Model X', 'Bentley Bentayga', 'Rolls-Royce Cullinan',
  ],
  estate: [
    'Mercedes-Benz E-Class Estate', 'BMW 5 Series Touring',
    'Audi A6 Avant', 'Volvo V90',
    'Jaguar XF Sportbrake', 'Skoda Superb Estate',
  ],
  mpv: [
    'Mercedes-Benz V-Class', 'Volkswagen Caravelle',
    'Ford Galaxy', 'SEAT Alhambra', 'Chrysler Grand Voyager',
  ],
  minibus: [
    'Mercedes-Benz Sprinter Minibus', 'Ford Transit Minibus',
    'Volkswagen Crafter Minibus', 'Iveco Daily Minibus',
    'Toyota HiAce', 'Ford Tourneo Custom',
  ],
  van: [
    'Mercedes-Benz Vito', 'Mercedes-Benz Sprinter',
    'Ford Transit', 'Volkswagen Transporter',
    'Renault Trafic', 'Vauxhall Vivaro',
  ],
}

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
  price_type: 'fixed' as 'fixed' | 'per_hour' | 'per_day',
  preferred_car_type: '' as CarType | '',
  preferred_car_model: '',
  notes: '',
  driver_id: '',
  open_for_applications: false,
  visibility: 'company' as 'company' | 'platform' | 'direct',
  target_drivers: [] as DriverSearchResult[],
  allow_counter_offer: true,
  client_price: '',
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
    vehicle_id: string | null; created_at: string; driver_name?: string;
    counter_price: number | null; counter_note: string | null;
  }[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  // Review modal
  const [reviewModal, setReviewModal] = useState(false)
  const [reviewJob, setReviewJob] = useState<Job | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewedJobIds, setReviewedJobIds] = useState<Set<string>>(new Set())

  async function submitReview() {
    if (!reviewJob || !reviewJob.driver_id || reviewRating === 0) return
    setReviewSaving(true)
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: reviewJob.id, driverId: reviewJob.driver_id, rating: reviewRating, comment: reviewComment }),
    })
    setReviewedJobIds(prev => new Set([...prev, reviewJob.id]))
    setReviewModal(false)
    setReviewJob(null)
    setReviewRating(0)
    setReviewComment('')
    setReviewSaving(false)
  }

  // Pay driver
  const [payingJob, setPayingJob] = useState<string | null>(null)

  async function payDriver(jobId: string) {
    setPayingJob(jobId)
    const res = await fetch('/api/stripe/jobs/pay-driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })
    const json = await res.json()
    if (res.ok && json.url) {
      window.location.href = json.url
    } else {
      alert(json.error ?? 'Failed to start payment')
    }
    setPayingJob(null)
  }

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatJobId, setChatJobId] = useState<string | undefined>()
  const [chatJobTitle, setChatJobTitle] = useState('')
  const [chatDriverId, setChatDriverId] = useState('')
  const [chatDriverName, setChatDriverName] = useState('')

  const filtered = jobs.filter(j => {
    const matchSearch =
      j.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      j.dropoff_address.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  // Route legs helpers
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

  // When switching job type, adjust route_legs length
  function setJobType(t: 'standard' | 'daily') {
    setForm(f => ({
      ...f,
      job_type: t,
      // daily = single location; standard = pickup + dropoff
      route_legs: t === 'daily' ? [f.route_legs[0] ?? ''] : [f.route_legs[0] ?? '', f.route_legs[1] ?? ''],
    }))
  }

  async function handleCreate() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const isDaily = form.job_type === 'daily'
    const stops = form.route_legs.map(s => s.trim()).filter(Boolean)

    if (isDaily && stops.length < 1) {
      setError('Please enter a job location.')
      setSaving(false)
      return
    }
    if (!isDaily && stops.length < 2) {
      setError('Please fill in at least a pickup and drop-off address.')
      setSaving(false)
      return
    }

    const isDirected = form.visibility === 'direct'
    const payload = {
      company_id: companyId,
      created_by: createdBy,
      pickup_address: stops[0],
      dropoff_address: isDaily ? stops[0] : stops[stops.length - 1],
      route_legs: isDaily ? stops : stops,
      job_date: form.job_date,
      job_time: form.job_time,
      end_time: form.end_time || null,
      job_type: form.job_type,
      hours_per_day: isDaily && form.hours_per_day ? Number(form.hours_per_day) : null,
      number_of_days: isDaily && form.number_of_days ? Number(form.number_of_days) : null,
      price: Number(form.price) || 0,
      price_type: isDaily ? form.price_type : 'fixed',
      preferred_car_type: form.preferred_car_type || null,
      preferred_car_model: form.preferred_car_model || null,
      notes: form.notes || null,
      status: (form.driver_id ? 'assigned' : 'pending') as JobStatus,
      driver_id: form.driver_id || null,
      // platform = broadcast to all drivers → always open for applications
      // direct   = specific driver(s) → never open for general applications
      // company  = follow the toggle
      open_for_applications: isDirected ? false : (form.driver_id ? false : (form.visibility === 'platform' ? true : form.open_for_applications)),
      visibility: form.visibility,
      target_driver_ids: isDirected ? form.target_drivers.map(d => d.id) : [],
      allow_counter_offer: form.allow_counter_offer,
      client_price: form.client_price ? Number(form.client_price) : null,
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
          body: `${stops[0]}${!isDaily ? ` → ${stops[stops.length - 1]}` : ''}`,
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

  const isDaily = form.job_type === 'daily'
  const modelOptions = form.preferred_car_type ? (CAR_MODELS_BY_TYPE[form.preferred_car_type as CarType] ?? []) : []

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
            const jobIsDaily = job.job_type === 'daily'

            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Route */}
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="font-medium text-gray-800 truncate">{legs[0].from}</span>
                        </div>
                        {jobIsDaily ? (
                          <span className="ml-6 text-xs text-amber-600 font-medium">Daily Hire</span>
                        ) : isMultiLeg ? (
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
                        {jobIsDaily && (
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                            Daily{job.hours_per_day ? ` · ${job.hours_per_day}h/day` : ''}{job.number_of_days ? ` · ${job.number_of_days} day${job.number_of_days !== 1 ? 's' : ''}` : ''}
                          </span>
                        )}
                        <span className="font-semibold text-gray-700">
                          {formatCurrency(job.price)}
                          {jobIsDaily && (job as any).price_type === 'per_hour' && <span className="font-normal text-gray-400">/hr</span>}
                          {jobIsDaily && (job as any).price_type === 'per_day'  && <span className="font-normal text-gray-400">/day</span>}
                        </span>
                        {(job as any).client_price > 0 && (
                          <>
                            <span className="text-green-600 font-semibold">
                              → {formatCurrency((job as any).client_price)}
                              <span className="text-green-500 font-normal"> client</span>
                            </span>
                            <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${
                              (job as any).client_price - job.price >= 0
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-600'
                            }`}>
                              {(job as any).client_price - job.price >= 0 ? '+' : ''}{formatCurrency((job as any).client_price - job.price)} profit
                            </span>
                          </>
                        )}
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
                        {job.status === 'completed' && (
                          <>
                            <a
                              href={`/api/jobs/${job.id}/invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors font-medium"
                            >
                              <FileText className="w-3 h-3" />
                              Invoice
                            </a>
                            {job.driver_id && (job as any).payment_status !== 'paid' && (
                              <button
                                onClick={() => payDriver(job.id)}
                                disabled={payingJob === job.id}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-colors font-medium disabled:opacity-50"
                              >
                                <CreditCard className="w-3 h-3" />
                                {payingJob === job.id ? '...' : 'Pay Driver'}
                              </button>
                            )}
                            {(job as any).payment_status === 'paid' && (
                              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-medium">
                                ✓ Paid
                              </span>
                            )}
                            {job.driver_id && !reviewedJobIds.has(job.id) && (
                              <button
                                onClick={() => { setReviewJob(job); setReviewRating(0); setReviewComment(''); setReviewModal(true) }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition-colors font-medium"
                              >
                                <Star className="w-3 h-3" />
                                Rate Driver
                              </button>
                            )}
                            {reviewedJobIds.has(job.id) && (
                              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-lg font-medium">
                                ★ Rated
                              </span>
                            )}
                          </>
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
                onClick={() => setJobType(t)}
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
              <label className="text-xs font-medium text-gray-700">
                {isDaily ? 'Job Location *' : 'Route *'}
              </label>
              {!isDaily && (
                <span className="text-xs text-gray-400">{form.route_legs.length - 1} leg{form.route_legs.length - 1 !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="space-y-2">
              {form.route_legs.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {!isDaily && (
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
                  )}
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={stop}
                      onChange={v => updateLeg(idx, v)}
                      placeholder={
                        isDaily ? 'Enter job location...' :
                        idx === 0 ? 'Pickup address...' :
                        idx === form.route_legs.length - 1 ? 'Drop-off address...' :
                        `Stop ${idx + 1}...`
                      }
                    />
                  </div>
                  {!isDaily && form.route_legs.length > 2 && (
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
            {!isDaily && (
              <button
                type="button"
                onClick={addLeg}
                className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Leg
              </button>
            )}
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
          {isDaily && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1">Price Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'fixed',    label: 'Fixed',      desc: 'Total price' },
                    { key: 'per_hour', label: 'Per Hour',   desc: 'Rate × hours' },
                    { key: 'per_day',  label: 'Per Day',    desc: 'Rate × days' },
                  ] as const).map(({ key, label, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, price_type: key }))}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-colors ${
                        form.price_type === key
                          ? 'border-amber-500 bg-amber-100 text-amber-800 font-semibold'
                          : 'border-amber-200 bg-white text-amber-700 hover:border-amber-400'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-amber-500 font-normal">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Price & Car Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {isDaily && form.price_type === 'per_hour' ? 'Driver Rate per Hour (£)' :
                 isDaily && form.price_type === 'per_day'  ? 'Driver Rate per Day (£)' : 'Driver Cost (£)'}
                <span className="ml-1.5 text-gray-400 font-normal">— paid to driver</span>
              </label>
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
                onChange={e => setForm(f => ({ ...f, preferred_car_type: e.target.value as CarType, preferred_car_model: '' }))}
              >
                <option value="">Any</option>
                {CAR_TYPES.map(t => <option key={t} value={t}>{carTypeLabel(t)}</option>)}
              </select>
            </div>
          </div>

          {/* Client price (private — revenue tracking) */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold text-green-800">Client Charge (£)</span>
              <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-medium">Private — not visible to drivers</span>
            </div>
            <input
              type="number" min="0" step="0.01"
              className="w-full px-3 py-2 border border-green-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.client_price}
              onChange={e => setForm(f => ({ ...f, client_price: e.target.value }))}
              placeholder="Amount you charge the client"
            />
            {form.client_price && form.price && Number(form.client_price) > 0 && Number(form.price) > 0 && (
              <p className="text-xs mt-1.5 text-green-700 font-medium">
                Profit: £{(Number(form.client_price) - Number(form.price)).toFixed(2)}
                <span className="text-green-500 ml-1">
                  ({Math.round(((Number(form.client_price) - Number(form.price)) / Number(form.client_price)) * 100)}% margin)
                </span>
              </p>
            )}
          </div>

          {/* Car Model — dropdown based on selected category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Preferred Car Model
              {!form.preferred_car_type && <span className="text-gray-400 ml-1">(select a category first)</span>}
            </label>
            {modelOptions.length > 0 ? (
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.preferred_car_model}
                onChange={e => setForm(f => ({ ...f, preferred_car_model: e.target.value }))}
              >
                <option value="">Any model</option>
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-400 cursor-not-allowed"
                value={form.preferred_car_model}
                disabled
                placeholder="Select a car category above"
              />
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Who can see this job?</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'company',  icon: Building2, label: 'Company Only',    desc: 'Your drivers' },
                { key: 'platform', icon: Globe,     label: 'All Drivers',     desc: 'Freelancers too' },
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
          )}

          {/* Allow counter offers toggle */}
          {form.open_for_applications && (
            <div className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                <p className="text-sm font-medium text-amber-900">Allow Counter Offers</p>
                <p className="text-xs text-amber-600 mt-0.5">Drivers can propose a different price when applying</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, allow_counter_offer: !f.allow_counter_offer }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.allow_counter_offer ? 'bg-amber-500' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  form.allow_counter_offer ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )}

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
              disabled={
                saving ||
                (isDaily ? form.route_legs.filter(s => s.trim()).length < 1 : form.route_legs.filter(s => s.trim()).length < 2) ||
                (form.visibility === 'direct' && form.target_drivers.length === 0)
              }
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
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{app.driver_name ?? 'Unknown Driver'}</p>
                      {app.message && <p className="text-xs text-gray-500 mt-0.5 italic">"{app.message}"</p>}

                      {/* Counter offer */}
                      {app.counter_price && (
                        <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs text-amber-700 font-semibold">Counter offer: {formatCurrency(app.counter_price)}</span>
                          {app.counter_note && <span className="text-xs text-amber-600">— {app.counter_note}</span>}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1">{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {/* Chat button */}
                      <button
                        onClick={() => {
                          setChatDriverId(app.driver_id)
                          setChatDriverName(app.driver_name ?? 'Driver')
                          setChatJobId(applicationsJob!.id)
                          setChatJobTitle(`${applicationsJob!.pickup_address.split(',')[0]} → ${applicationsJob!.dropoff_address.split(',')[0]}`)
                          setChatOpen(true)
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>

                      {app.status === 'pending' && (
                        <button
                          onClick={() => acceptApplication(app.id, app.driver_id, applicationsJob!.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                        >
                          {app.counter_price ? `Accept ${formatCurrency(app.counter_price)}` : 'Accept'}
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

      {/* ─── Rate Driver Modal ─── */}
      <Modal isOpen={reviewModal} onClose={() => setReviewModal(false)} title="Rate Driver" size="sm">
        <div className="space-y-4">
          {reviewJob && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-gray-700">{reviewJob.pickup_address} → {reviewJob.dropoff_address}</p>
              <p className="text-gray-400 text-xs mt-0.5">{reviewJob.job_date} · {drivers.find(d => d.id === reviewJob.driver_id)?.full_name ?? 'Driver'}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setReviewRating(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`w-8 h-8 ${n <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                </button>
              ))}
            </div>
            {[0,1,2,3,4,5].includes(reviewRating) && reviewRating > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                {reviewRating === 1 ? 'Poor' : reviewRating === 2 ? 'Below average' : reviewRating === 3 ? 'Average' : reviewRating === 4 ? 'Good' : 'Excellent'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Comment (optional)</label>
            <textarea
              rows={3}
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Punctual, professional, great service..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setReviewModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
            <button
              onClick={submitReview}
              disabled={reviewRating === 0 || reviewSaving}
              className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {reviewSaving ? 'Saving...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Chat modal */}
      <ChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        jobId={chatJobId}
        jobTitle={chatJobTitle}
        currentUserId={createdBy}
        currentUserName="Admin"
        recipientId={chatDriverId}
        recipientName={chatDriverName}
      />
    </div>
  )
}
