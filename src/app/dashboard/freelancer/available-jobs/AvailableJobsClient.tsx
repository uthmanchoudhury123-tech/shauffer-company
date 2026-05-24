'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Car, Star, Search, Plus, Globe, Users, User2, X, Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatCurrency, carTypeLabel } from '@/lib/utils'
import type { CarType } from '@/types'

interface DriverSearchResult {
  id: string
  full_name: string
  car_type: string
  driver_category: string
  company_name: string | null
}

interface FreelancerJob {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  price: number
  preferred_car_type: CarType | null
  required_car_make: string | null
  required_car_model: string | null
  notes: string | null
  visibility?: string
  posted_by_driver: { id: string; full_name: string; rating: number } | null
}

interface Props {
  jobs: FreelancerJob[]
  appliedJobIds: string[]
  driverId: string
}

const CAR_TYPES: CarType[] = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']

export function AvailableJobsClient({ jobs: initial, appliedJobIds: initialApplied, driverId }: Props) {
  const router = useRouter()
  const [jobs] = useState(initial)
  const [applied, setApplied] = useState<Set<string>>(new Set(initialApplied))
  const [search, setSearch] = useState('')
  const [applyModal, setApplyModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<FreelancerJob | null>(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')

  // Post job modal
  const [postModal, setPostModal] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [postForm, setPostForm] = useState({
    pickup_address: '',
    dropoff_address: '',
    job_date: new Date().toISOString().split('T')[0],
    job_time: '09:00',
    price: '',
    preferred_car_type: '' as CarType | '',
    required_car_make: '',
    required_car_model: '',
    notes: '',
  })

  // Visibility state
  const [postVisibility, setPostVisibility] = useState<'all' | 'direct'>('all')
  const [targetDrivers, setTargetDrivers] = useState<DriverSearchResult[]>([])
  const [driverSearch, setDriverSearch] = useState('')
  const [driverResults, setDriverResults] = useState<DriverSearchResult[]>([])
  const [driverSearching, setDriverSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDriverResults([])
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = jobs.filter(j =>
    j.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
    j.dropoff_address.toLowerCase().includes(search.toLowerCase())
  )

  async function handleApply() {
    if (!selectedJob) return
    setApplying(true)
    setApplyError('')
    const res = await fetch('/api/freelancer/jobs/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob.id, message: applyMessage }),
    })
    const json = await res.json()
    if (!res.ok) { setApplyError(json.error); setApplying(false); return }
    setApplied(prev => new Set([...prev, selectedJob.id]))
    setApplyModal(false)
    setApplyMessage('')
    setApplying(false)
  }

  async function searchDrivers(q: string) {
    setDriverSearch(q)
    if (q.length < 2) { setDriverResults([]); return }
    setDriverSearching(true)
    try {
      const res = await fetch(`/api/drivers/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setDriverResults(Array.isArray(data) ? data : [])
    } finally {
      setDriverSearching(false)
    }
  }

  function addTargetDriver(d: DriverSearchResult) {
    if (!targetDrivers.find(x => x.id === d.id)) {
      setTargetDrivers(prev => [...prev, d])
    }
    setDriverSearch('')
    setDriverResults([])
  }

  function removeTargetDriver(id: string) {
    setTargetDrivers(prev => prev.filter(d => d.id !== id))
  }

  function openPostModal() {
    setPostError('')
    setPostVisibility('all')
    setTargetDrivers([])
    setDriverSearch('')
    setDriverResults([])
    setPostModal(true)
  }

  async function handlePost() {
    setPosting(true)
    setPostError('')
    const res = await fetch('/api/freelancer/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...postForm,
        visibility: postVisibility,
        target_driver_ids: targetDrivers.map(d => d.id),
      }),
    })
    const json = await res.json()
    if (!res.ok) { setPostError(json.error); setPosting(false); return }
    setPostModal(false)
    setPosting(false)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} job{filtered.length !== 1 ? 's' : ''} available</p>
        </div>
        <button
          onClick={openPostModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post a Job
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Jobs */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No jobs available right now</p>
          <p className="text-gray-400 text-xs mt-1">Check back soon or post your own job</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const hasApplied = applied.has(job.id)
            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Route */}
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{job.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-gray-600 truncate">{job.dropoff_address}</span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(job.job_date)} at {job.job_time}
                      </span>
                      {(job.required_car_make || job.preferred_car_type) && (
                        <span className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          {job.required_car_make
                            ? `${job.required_car_make}${job.required_car_model ? ` ${job.required_car_model}` : ''}`
                            : carTypeLabel(job.preferred_car_type!)
                          }
                        </span>
                      )}
                      {job.visibility === 'direct' && (
                        <span className="flex items-center gap-1 text-purple-500">
                          <Lock className="w-3.5 h-3.5" />
                          Sent to you
                        </span>
                      )}
                    </div>

                    {job.notes && (
                      <p className="text-xs text-gray-400 italic mt-1.5">{job.notes}</p>
                    )}

                    {/* Posted by */}
                    {job.posted_by_driver && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-bold">
                          {job.posted_by_driver.full_name.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-500">{job.posted_by_driver.full_name}</span>
                        {job.posted_by_driver.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {job.posted_by_driver.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price + action */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(job.price)}</p>
                    {hasApplied ? (
                      <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium">
                        Applied ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => { setSelectedJob(job); setApplyError(''); setApplyModal(true) }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Apply Modal */}
      <Modal isOpen={applyModal} onClose={() => setApplyModal(false)} title="Apply for Job" size="sm">
        {selectedJob && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-green-500" />
                {selectedJob.pickup_address}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {selectedJob.dropoff_address}
              </div>
              <p className="font-bold text-gray-900 pt-1">{formatCurrency(selectedJob.price)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message to poster (optional)</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tell them why you're a great fit..."
                value={applyMessage}
                onChange={e => setApplyMessage(e.target.value)}
              />
            </div>
            {applyError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{applyError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setApplyModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleApply} disabled={applying} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
                {applying ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Post Job Modal */}
      <Modal isOpen={postModal} onClose={() => setPostModal(false)} title="Post a Job" size="lg">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            The job price will be held in escrow from your wallet until the job is completed.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pickup Address *</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={postForm.pickup_address} onChange={e => setPostForm(f => ({ ...f, pickup_address: e.target.value }))}
              placeholder="e.g. Heathrow Airport, Terminal 2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Drop-off Address *</label>
            <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={postForm.dropoff_address} onChange={e => setPostForm(f => ({ ...f, dropoff_address: e.target.value }))}
              placeholder="e.g. 10 Canary Wharf, London" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={postForm.job_date} onChange={e => setPostForm(f => ({ ...f, job_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time *</label>
              <input type="time" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={postForm.job_time} onChange={e => setPostForm(f => ({ ...f, job_time: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Price you'll pay (£) *</label>
            <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={postForm.price} onChange={e => setPostForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Car Type Required</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={postForm.preferred_car_type} onChange={e => setPostForm(f => ({ ...f, preferred_car_type: e.target.value as CarType }))}>
              <option value="">Any</option>
              {CAR_TYPES.map(t => <option key={t} value={t}>{carTypeLabel(t)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Required Make (optional)</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={postForm.required_car_make} onChange={e => setPostForm(f => ({ ...f, required_car_make: e.target.value }))}
                placeholder="e.g. Mercedes" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Required Model (optional)</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={postForm.required_car_model} onChange={e => setPostForm(f => ({ ...f, required_car_model: e.target.value }))}
                placeholder="e.g. S Class" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={postForm.notes} onChange={e => setPostForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any special requirements..." />
          </div>

          {/* ── Visibility ── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Who can see this job?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostVisibility('all')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  postVisibility === 'all'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                <Globe className="w-4 h-4 flex-shrink-0" />
                All Drivers
              </button>
              <button
                type="button"
                onClick={() => setPostVisibility('direct')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  postVisibility === 'direct'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                }`}
              >
                <User2 className="w-4 h-4 flex-shrink-0" />
                Specific Drivers
              </button>
            </div>

            {/* Direct targeting — driver search */}
            {postVisibility === 'direct' && (
              <div className="mt-3 space-y-2">
                {/* Selected drivers */}
                {targetDrivers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {targetDrivers.map(d => (
                      <span key={d.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-700">
                        <User2 className="w-3 h-3" />
                        {d.full_name}
                        <button type="button" onClick={() => removeTargetDriver(d.id)} className="hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative" ref={searchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Search driver by name…"
                    value={driverSearch}
                    onChange={e => searchDrivers(e.target.value)}
                  />
                  {/* Dropdown */}
                  {(driverResults.length > 0 || driverSearching) && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {driverSearching ? (
                        <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
                      ) : driverResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">No drivers found</div>
                      ) : (
                        driverResults.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onMouseDown={() => addTargetDriver(d)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                              {d.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{d.full_name}</p>
                              <p className="text-xs text-gray-400">{d.driver_category ?? 'freelance'}{d.company_name ? ` · ${d.company_name}` : ''}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {targetDrivers.length === 0 && (
                  <p className="text-xs text-gray-400">Search and add at least one driver to target.</p>
                )}
              </div>
            )}
          </div>

          {postError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{postError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setPostModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
            <button
              onClick={handlePost}
              disabled={
                posting ||
                !postForm.pickup_address ||
                !postForm.dropoff_address ||
                !postForm.price ||
                (postVisibility === 'direct' && targetDrivers.length === 0)
              }
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
            >
              {posting ? 'Posting...' : 'Post Job'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
