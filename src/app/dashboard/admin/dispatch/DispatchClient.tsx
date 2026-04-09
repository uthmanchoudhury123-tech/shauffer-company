'use client'

import { Radio, MapPin, Clock, UserCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { jobStatusColor, driverStatusColor, formatDate, carTypeLabel } from '@/lib/utils'
import type { Job } from '@/types'

interface DriverRow {
  id: string
  full_name: string
  availability_status: string
  car_type: string
  current_lat?: number
  current_lng?: number
}

interface DispatchClientProps {
  jobs: Job[]
  drivers: DriverRow[]
}

export function DispatchClient({ jobs, drivers }: DispatchClientProps) {
  const pendingJobs   = jobs.filter(j => j.status === 'pending')
  const assignedJobs  = jobs.filter(j => j.status === 'assigned')
  const activeJobs    = jobs.filter(j => j.status === 'in_progress')

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Radio className="w-6 h-6 text-blue-600" />
          Dispatch Panel
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Live view of all active and pending jobs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Job columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" />
              Pending ({pendingJobs.length})
            </h2>
            {pendingJobs.length === 0 ? (
              <p className="text-sm text-gray-300 pl-4">No pending jobs</p>
            ) : (
              <div className="space-y-2">
                {pendingJobs.map(job => (
                  <JobCard key={job.id} job={job} drivers={drivers} />
                ))}
              </div>
            )}
          </section>

          {/* Assigned */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full inline-block" />
              Assigned ({assignedJobs.length})
            </h2>
            {assignedJobs.length === 0 ? (
              <p className="text-sm text-gray-300 pl-4">No assigned jobs</p>
            ) : (
              <div className="space-y-2">
                {assignedJobs.map(job => (
                  <JobCard key={job.id} job={job} drivers={drivers} />
                ))}
              </div>
            )}
          </section>

          {/* In Progress */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full inline-block animate-pulse" />
              In Progress ({activeJobs.length})
            </h2>
            {activeJobs.length === 0 ? (
              <p className="text-sm text-gray-300 pl-4">No jobs in progress</p>
            ) : (
              <div className="space-y-2">
                {activeJobs.map(job => (
                  <JobCard key={job.id} job={job} drivers={drivers} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Driver availability panel */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Driver Availability ({drivers.length})
          </h2>
          <div className="space-y-2">
            {drivers.length === 0 ? (
              <p className="text-sm text-gray-300">No drivers found</p>
            ) : (
              drivers
                .sort((a, b) => {
                  // Sort: available first, then on_job, then offline
                  const order = { available: 0, on_job: 1, offline: 2 }
                  return (order[a.availability_status as keyof typeof order] ?? 3) -
                         (order[b.availability_status as keyof typeof order] ?? 3)
                })
                .map(driver => {
                  // Find which job this driver is on
                  const activeJob = jobs.find(
                    j => j.driver_id === driver.id && (j.status === 'assigned' || j.status === 'in_progress')
                  )
                  return (
                    <div
                      key={driver.id}
                      className="bg-white rounded-lg border border-gray-200 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{driver.full_name}</span>
                        <Badge className={driverStatusColor(driver.availability_status)}>
                          {driver.availability_status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{carTypeLabel(driver.car_type)}</p>
                      {activeJob && (
                        <p className="text-xs text-blue-600 mt-1 truncate">
                          → {activeJob.dropoff_address}
                        </p>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function JobCard({ job, drivers }: { job: Job; drivers: DriverRow[] }) {
  const driver = drivers.find(d => d.id === job.driver_id)

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="font-medium text-gray-800 truncate">{job.pickup_address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-0.5 ml-5">
            <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-gray-500 truncate">{job.dropoff_address}</span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(job.job_date)} at {job.job_time}
            </span>
            {driver && (
              <span className="flex items-center gap-1 text-blue-600">
                <UserCheck className="w-3 h-3" />
                {driver.full_name}
              </span>
            )}
          </div>
        </div>
        <Badge className={jobStatusColor(job.status)}>
          {job.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  )
}
