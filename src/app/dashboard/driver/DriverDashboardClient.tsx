'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase, MapPin, Clock, CheckCircle, Star,
  AlertCircle, PlayCircle, Car
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { jobStatusColor, formatDate, formatCurrency, carTypeLabel } from '@/lib/utils'
import type { Job, AvailabilityStatus } from '@/types'

interface DriverProfile {
  availability_status: string
  rating: number
  rating_count: number
  is_verified: boolean
  car_type: string
}

interface DriverDashboardClientProps {
  driverName: string
  driverProfile: DriverProfile | null
  jobs: Job[]
  driverId: string
}

export function DriverDashboardClient({
  driverName,
  driverProfile,
  jobs: initial,
  driverId,
}: DriverDashboardClientProps) {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>(initial)
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    (driverProfile?.availability_status as AvailabilityStatus) ?? 'offline'
  )
  const [updatingAvailability, setUpdatingAvailability] = useState(false)

  // Job counts
  const upcomingJobs = jobs.filter(j => j.status === 'assigned')
  const activeJob = jobs.find(j => j.status === 'in_progress')
  const completedJobs = jobs.filter(j => j.status === 'completed')

  async function updateAvailability(status: AvailabilityStatus) {
    setUpdatingAvailability(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('drivers')
      .update({ availability_status: status })
      .eq('id', driverId)

    if (!error) {
      setAvailability(status)
    }
    setUpdatingAvailability(false)
  }

  async function updateJobStatus(jobId: string, status: Job['status']) {
    const supabase = createClient()
    const { data } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId)
      .select()
      .single()
    if (data) {
      setJobs(prev => prev.map(j => j.id === jobId ? data : j))
      // If starting a job, update driver to on_job
      if (status === 'in_progress') {
        await updateAvailability('on_job')
      }
      // If completing, set back to available
      if (status === 'completed') {
        const remainingActive = jobs.filter(j => j.id !== jobId && j.status === 'in_progress')
        if (remainingActive.length === 0) {
          await updateAvailability('available')
        }
      }
    }
    router.refresh()
  }

  const availabilityColors: Record<AvailabilityStatus, string> = {
    available: 'bg-green-100 border-green-300 text-green-800',
    on_job:    'bg-blue-100 border-blue-300 text-blue-800',
    offline:   'bg-gray-100 border-gray-300 text-gray-600',
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {driverName.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-0.5 text-sm">Here are your assigned jobs</p>
      </div>

      {/* Driver Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">
                {driverName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">{driverName}</h2>
                {driverProfile?.is_verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500" aria-label="Verified" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {[1,2,3,4,5].map(n => (
                  <Star
                    key={n}
                    className={`w-3 h-3 ${
                      n <= Math.round(driverProfile?.rating ?? 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-400 ml-1">
                  {(driverProfile?.rating ?? 0) > 0
                    ? `${(driverProfile?.rating ?? 0).toFixed(1)} (${driverProfile?.rating_count ?? 0} ratings)`
                    : 'No ratings yet'
                  }
                </span>
              </div>
              {driverProfile?.car_type && (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  {carTypeLabel(driverProfile.car_type)}
                </p>
              )}
            </div>
          </div>

          {/* Availability toggle */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">My availability</p>
            <div className="flex gap-2">
              {(['available', 'offline'] as AvailabilityStatus[]).map(s => (
                <button
                  key={s}
                  disabled={updatingAvailability || availability === 'on_job'}
                  onClick={() => updateAvailability(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${availability === s
                      ? availabilityColors[s]
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              {availability === 'on_job' && (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${availabilityColors.on_job}`}>
                  On Job
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{upcomingJobs.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Upcoming Jobs</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{activeJob ? 1 : 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Now</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{completedJobs.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed</p>
        </div>
      </div>

      {/* Active Job — shown prominently if exists */}
      {activeJob && (
        <div className="bg-blue-600 rounded-xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5" />
            <span className="font-semibold">Job In Progress</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-blue-100">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{activeJob.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{activeJob.dropoff_address}</span>
            </div>
          </div>
          {activeJob.notes && (
            <p className="mt-2 text-sm text-blue-200 italic">{activeJob.notes}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => updateJobStatus(activeJob.id, 'completed')}
              className="px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold
                         hover:bg-blue-50 transition-colors"
            >
              Mark Complete
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Jobs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Upcoming Jobs ({upcomingJobs.length})
        </h2>

        {upcomingJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
            <AlertCircle className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No upcoming jobs assigned to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingJobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4">
                {/* Route */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="font-medium text-gray-800">{job.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm ml-1">
                    <div className="w-3 border-l-2 border-dashed border-gray-200 h-3 ml-0.5" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-gray-600">{job.dropoff_address}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(job.job_date)} at {job.job_time}
                  </span>
                  {job.price > 0 && (
                    <span className="text-gray-600 font-semibold">{formatCurrency(job.price)}</span>
                  )}
                  {job.preferred_car_type && (
                    <span>{carTypeLabel(job.preferred_car_type)}</span>
                  )}
                </div>

                {job.notes && (
                  <p className="text-xs text-gray-400 italic mb-3">{job.notes}</p>
                )}

                {/* Action */}
                <div className="flex items-center justify-between">
                  <Badge className={jobStatusColor(job.status)}>
                    {job.status.replace('_', ' ')}
                  </Badge>
                  {job.status === 'assigned' && !activeJob && (
                    <button
                      onClick={() => updateJobStatus(job.id, 'in_progress')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Start Job
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Completed Jobs ({completedJobs.length})
          </h2>
          <div className="space-y-2">
            {completedJobs.slice(0, 5).map(job => (
              <div key={job.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center justify-between gap-3 opacity-70">
                <div className="min-w-0">
                  <p className="text-sm text-gray-600 truncate">
                    {job.pickup_address} → {job.dropoff_address}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(job.job_date)}</p>
                </div>
                <Badge className={jobStatusColor(job.status)}>Completed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
