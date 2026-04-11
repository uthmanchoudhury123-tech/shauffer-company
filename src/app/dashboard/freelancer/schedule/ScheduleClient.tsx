'use client'

import { CalendarDays, Clock, CheckCircle2, Loader2 } from 'lucide-react'

interface Job {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  price: number
  status: string
  poster: { id: string; full_name: string } | null
}

interface Props { jobs: Job[] }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
function isToday(d: string) {
  return new Date(d).toDateString() === new Date().toDateString()
}
function isTomorrow(d: string) {
  const t = new Date(); t.setDate(t.getDate() + 1)
  return new Date(d).toDateString() === t.toDateString()
}
function groupByDate(jobs: Job[]) {
  return jobs.reduce<Record<string, Job[]>>((acc, j) => {
    const key = j.job_date
    acc[key] = acc[key] ? [...acc[key], j] : [j]
    return acc
  }, {})
}
function dayLabel(d: string) {
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return formatDate(d)
}

const statusConfig: Record<string, { label: string; color: string }> = {
  accepted:    { label: 'Accepted',    color: 'bg-blue-500/20 text-blue-400'   },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400' },
}

export function ScheduleClient({ jobs }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-300 font-medium">No upcoming jobs</p>
          <p className="text-gray-500 text-sm mt-1">Jobs you accept will appear here</p>
        </div>
      </div>
    )
  }

  const grouped = groupByDate(jobs)

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <p className="text-gray-400 text-sm mt-1">{jobs.length} upcoming job{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Timeline */}
      <div className="space-y-8 max-w-2xl">
        {Object.entries(grouped).map(([date, dayJobs]) => (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                isToday(date) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
              }`}>
                {dayLabel(date)}
              </div>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Jobs for this day */}
            <div className="space-y-3">
              {dayJobs.map(job => (
                <div key={job.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Time + status */}
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-400 text-sm">{job.job_time ?? 'TBC'}</span>
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[job.status]?.color ?? 'bg-gray-700 text-gray-300'
                        }`}>
                          {statusConfig[job.status]?.label ?? job.status}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                          <p className="text-white text-sm leading-tight">{job.pickup_address}</p>
                        </div>
                        <div className="ml-1 w-px h-3 bg-gray-700 ml-[3px]" />
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                          <p className="text-gray-300 text-sm leading-tight">{job.dropoff_address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-400 font-bold text-lg">£{job.price.toFixed(2)}</p>
                      {job.poster && (
                        <p className="text-gray-500 text-xs mt-0.5">by {job.poster.full_name}</p>
                      )}
                    </div>
                  </div>

                  {job.status === 'in_progress' && (
                    <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2 text-yellow-400 text-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>This job is currently in progress</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
