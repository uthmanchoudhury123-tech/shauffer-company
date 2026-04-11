'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Car, Star, Users, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react'
import { formatDate, formatCurrency, carTypeLabel } from '@/lib/utils'
import type { CarType } from '@/types'

interface Applicant {
  id: string
  full_name: string
  rating: number
  car_type: CarType
}

interface Application {
  id: string
  applicant_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'rejected'
  applicant: Applicant | null
}

interface PostedJob {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  price: number
  status: string
  funds_released: boolean
  required_car_make: string | null
  required_car_model: string | null
  preferred_car_type: CarType | null
  job_applications: Application[]
}

interface AppliedJob {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  message: string | null
  job: {
    id: string
    pickup_address: string
    dropoff_address: string
    job_date: string
    job_time: string
    price: number
    status: string
    funds_released: boolean
    posted_by: string
    poster: { id: string; full_name: string; rating: number } | null
  } | null
}

interface Props {
  postedJobs: PostedJob[]
  appliedJobs: AppliedJob[]
  driverId: string
}

const statusBadge: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  filled: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function MyJobsClient({ postedJobs, appliedJobs, driverId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'posted' | 'applied'>('posted')
  const [loading, setLoading] = useState<string | null>(null)

  async function acceptApplicant(jobId: string, applicationId: string, applicantId: string) {
    setLoading(applicationId)
    await fetch('/api/freelancer/jobs/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, applicationId, driverId: applicantId }),
    })
    setLoading(null)
    router.refresh()
  }

  async function updateJobStatus(jobId: string, action: 'start' | 'done') {
    setLoading(jobId)
    await fetch('/api/freelancer/jobs/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, action }),
    })
    setLoading(null)
    router.refresh()
  }

  async function releaseFunds(jobId: string) {
    setLoading(jobId)
    await fetch('/api/freelancer/jobs/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Jobs you posted and jobs you applied for</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {([['posted', `Posted (${postedJobs.length})`], ['applied', `Applied (${appliedJobs.length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Posted Jobs */}
      {tab === 'posted' && (
        <div className="space-y-4">
          {postedJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-14 text-center">
              <AlertCircle className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">You haven't posted any jobs yet</p>
            </div>
          ) : (
            postedJobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Job header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800">{job.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-gray-600">{job.dropoff_address}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[job.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(job.price)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(job.job_date)} at {job.job_time}
                    </span>
                    {(job.required_car_make || job.preferred_car_type) && (
                      <span className="flex items-center gap-1">
                        <Car className="w-3.5 h-3.5" />
                        {job.required_car_make
                          ? `${job.required_car_make}${job.required_car_model ? ` ${job.required_car_model}` : ''}`
                          : carTypeLabel(job.preferred_car_type!)}
                      </span>
                    )}
                  </div>

                  {/* Release funds button */}
                  {job.status === 'completed' && !job.funds_released && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-green-800">Job completed!</p>
                        <p className="text-xs text-green-600">Release {formatCurrency(job.price)} to the driver?</p>
                      </div>
                      <button
                        onClick={() => releaseFunds(job.id)}
                        disabled={loading === job.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {loading === job.id ? 'Releasing...' : 'Release Funds'}
                      </button>
                    </div>
                  )}
                  {job.status === 'completed' && job.funds_released && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Funds released
                    </div>
                  )}
                </div>

                {/* Applicants */}
                {job.status === 'open' && job.job_applications.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {job.job_applications.length} applicant{job.job_applications.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                      {job.job_applications.map(app => (
                        <div key={app.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                              {app.applicant?.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{app.applicant?.full_name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                {app.applicant?.car_type && <span>{carTypeLabel(app.applicant.car_type)}</span>}
                                {(app.applicant?.rating ?? 0) > 0 && (
                                  <span className="flex items-center gap-0.5 text-yellow-500">
                                    <Star className="w-3 h-3 fill-yellow-400" />
                                    {app.applicant?.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              {app.message && <p className="text-xs text-gray-500 italic mt-0.5 truncate">"{app.message}"</p>}
                            </div>
                          </div>
                          {app.status === 'pending' && (
                            <button
                              onClick={() => acceptApplicant(job.id, app.id, app.applicant_id)}
                              disabled={loading === app.id}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                            >
                              {loading === app.id ? '...' : 'Accept'}
                            </button>
                          )}
                          {app.status === 'accepted' && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Accepted
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Applied Jobs */}
      {tab === 'applied' && (
        <div className="space-y-3">
          {appliedJobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-14 text-center">
              <AlertCircle className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">You haven't applied to any jobs yet</p>
            </div>
          ) : (
            appliedJobs.map(app => {
              if (!app.job) return null
              const j = app.job
              return (
                <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate">{j.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-gray-600 truncate">{j.dropoff_address}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {app.status === 'accepted' ? '✓ Accepted' :
                         app.status === 'rejected' ? 'Not selected' : 'Pending'}
                      </span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(j.price)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(j.job_date)} at {j.job_time}
                    </span>
                    {j.poster && <span>by {j.poster.full_name}</span>}
                  </div>

                  {/* Action buttons for accepted driver */}
                  {app.status === 'accepted' && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      {j.status === 'filled' && (
                        <button
                          onClick={() => updateJobStatus(j.id, 'start')}
                          disabled={loading === j.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          {loading === j.id ? '...' : 'Start Job'}
                        </button>
                      )}
                      {j.status === 'in_progress' && (
                        <button
                          onClick={() => updateJobStatus(j.id, 'done')}
                          disabled={loading === j.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {loading === j.id ? '...' : 'Mark Complete'}
                        </button>
                      )}
                      {j.status === 'completed' && !j.funds_released && (
                        <p className="text-xs text-yellow-600 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Waiting for poster to release funds
                        </p>
                      )}
                      {j.status === 'completed' && j.funds_released && (
                        <p className="text-xs text-green-600 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {formatCurrency(j.price)} paid to your wallet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
