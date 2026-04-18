'use client'

import { useState } from 'react'
import { MapPin, Clock, Car, Send, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { carTypeLabel, formatDate, formatCurrency } from '@/lib/utils'

interface Job {
  id: string
  job_date: string
  job_time: string
  pickup_address: string
  dropoff_address: string
  preferred_car_type: string | null
  price: number
  notes: string | null
  status: string
}

interface Vehicle {
  id: string
  car_type: string
  make: string
  model: string
  registration: string
}

interface Application {
  job_id: string
  status: string
  id: string
}

export function AvailableJobsClient({
  jobs,
  allOpenJobs,
  myVehicles,
  myApplications,
  driverId,
  companyId,
  hasVehicles,
}: {
  jobs: Job[]
  allOpenJobs: Job[]
  myVehicles: Vehicle[]
  myApplications: Application[]
  driverId: string
  companyId: string
  hasVehicles: boolean
}) {
  const [applications, setApplications] = useState<Application[]>(myApplications)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  function getApplication(jobId: string) {
    return applications.find(a => a.job_id === jobId)
  }

  function getMatchingVehicles(job: Job) {
    if (!job.preferred_car_type) return myVehicles
    return myVehicles.filter(v => v.car_type === job.preferred_car_type)
  }

  async function applyForJob(job: Job) {
    if (!selectedVehicle && myVehicles.length > 0) {
      alert('Please select which vehicle you will use')
      return
    }
    setApplying(job.id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: job.id,
        driver_id: driverId,
        company_id: companyId,
        status: 'pending',
        message: message || null,
        vehicle_id: selectedVehicle || null,
      })
      .select('job_id, status, id')
      .single()

    if (!error && data) {
      setApplications(prev => [...prev, data])
      setExpanded(null)
      setMessage('')
      setSelectedVehicle('')
      setSuccess('Application submitted!')
      setTimeout(() => setSuccess(''), 3000)
    }
    setApplying(null)
  }

  async function withdrawApplication(jobId: string) {
    const app = getApplication(jobId)
    if (!app) return
    const supabase = createClient()
    await supabase.from('job_applications').delete().eq('id', app.id)
    setApplications(prev => prev.filter(a => a.job_id !== jobId))
  }

  const nonMatchingCount = allOpenJobs.length - jobs.length

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Open jobs matching your registered vehicles</p>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {!hasVehicles && (
        <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">No vehicles registered</p>
            <p className="text-xs text-amber-600 mt-0.5">
              <a href="/dashboard/driver/my-vehicles" className="underline">Add your vehicles</a> to see and apply for matching jobs
            </p>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No matching jobs available</p>
          <p className="text-gray-400 text-xs mt-1">
            {hasVehicles
              ? 'Check back soon — new jobs will appear here when posted'
              : 'Register your vehicles to see available jobs'}
          </p>
          {nonMatchingCount > 0 && (
            <p className="text-xs text-gray-400 mt-2">{nonMatchingCount} job{nonMatchingCount > 1 ? 's' : ''} available for other vehicle types</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const app = getApplication(job.id)
            const isExpanded = expanded === job.id
            const matchingVehicles = getMatchingVehicles(job)

            return (
              <div key={job.id} className={`bg-white rounded-xl border transition-all ${
                isExpanded ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
              }`}>
                <div className="p-4">
                  {/* Job header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">{job.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">{job.dropoff_address}</span>
                      </div>
                    </div>
                    {job.price > 0 && (
                      <span className="text-base font-bold text-gray-900 flex-shrink-0">
                        {formatCurrency(job.price)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(job.job_date)} at {job.job_time}
                    </span>
                    {job.preferred_car_type && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        <Car className="w-3 h-3" />
                        {carTypeLabel(job.preferred_car_type)}
                      </span>
                    )}
                  </div>

                  {job.notes && (
                    <p className="text-xs text-gray-400 italic mt-2">{job.notes}</p>
                  )}

                  {/* Action area */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    {app ? (
                      <div className="flex items-center justify-between w-full">
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${
                          app.status === 'accepted' ? 'text-green-600' :
                          app.status === 'rejected' ? 'text-red-500' : 'text-blue-600'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
                          {app.status === 'accepted' ? 'Application Accepted!' :
                           app.status === 'rejected' ? 'Application Rejected' :
                           'Application Pending'}
                        </span>
                        {app.status === 'pending' && (
                          <button
                            onClick={() => withdrawApplication(job.id)}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : job.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Apply
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Apply form */}
                {isExpanded && !app && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {matchingVehicles.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Which vehicle will you use?</label>
                        <div className="grid grid-cols-1 gap-2">
                          {matchingVehicles.map(v => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVehicle(v.id)}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                                selectedVehicle === v.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Car className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium">{v.make} {v.model}</span>
                              <span className="text-gray-400 ml-auto">{v.registration}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Message to admin (optional)</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Any relevant info..."
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => applyForJob(job)}
                        disabled={applying === job.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {applying === job.id ? 'Submitting...' : 'Submit Application'}
                      </button>
                      <button onClick={() => setExpanded(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
