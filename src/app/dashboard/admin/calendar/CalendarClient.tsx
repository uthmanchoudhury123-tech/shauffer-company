'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Job {
  id: string
  job_date: string
  job_time: string
  pickup_address: string
  dropoff_address: string
  status: string
  driver_id: string | null
}

interface Driver {
  id: string
  full_name: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  assigned:    'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  completed:   'bg-green-100 text-green-800 border-green-200',
  cancelled:   'bg-red-100 text-red-800 border-red-200',
}

const DOT_COLORS: Record<string, string> = {
  pending:     'bg-yellow-400',
  assigned:    'bg-blue-400',
  in_progress: 'bg-purple-400',
  completed:   'bg-green-400',
  cancelled:   'bg-red-400',
}

export function CalendarClient({ jobs, drivers }: { jobs: Job[]; drivers: Driver[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Monday start

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  function dateKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const jobsByDate = jobs.reduce<Record<string, Job[]>>((acc, job) => {
    if (!acc[job.job_date]) acc[job.job_date] = []
    acc[job.job_date].push(job)
    return acc
  }, {})

  const selectedJobs = selectedDay ? (jobsByDate[selectedDay] ?? []) : []
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">View scheduled jobs by date</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-base font-semibold text-gray-800">{monthName} {year}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {days.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const key = dateKey(day)
              const dayJobs = jobsByDate[key] ?? []
              const isToday = key === todayKey
              const isSelected = key === selectedDay

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 pb-1 px-1 transition-all text-sm
                    ${isSelected ? 'bg-blue-600 text-white' :
                      isToday ? 'bg-blue-50 text-blue-700 font-semibold' :
                      'hover:bg-gray-50 text-gray-700'}
                  `}
                >
                  <span className="font-medium leading-none mb-1">{day}</span>
                  {dayJobs.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayJobs.slice(0, 3).map((job, ji) => (
                        <span
                          key={ji}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : DOT_COLORS[job.status] ?? 'bg-gray-400'}`}
                        />
                      ))}
                      {dayJobs.length > 3 && (
                        <span className={`text-[9px] leading-none ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>+{dayJobs.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            {Object.entries(DOT_COLORS).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {status.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Jobs panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedJobs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No jobs on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedJobs.map(job => {
                    const driver = drivers.find(d => d.id === job.driver_id)
                    return (
                      <div key={job.id} className={`p-3 rounded-lg border text-sm ${STATUS_COLORS[job.status] ?? 'bg-gray-50 border-gray-200'}`}>
                        <div className="font-medium truncate">{job.pickup_address}</div>
                        <div className="text-xs mt-0.5 opacity-75">→ {job.dropoff_address}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-75">{job.job_time}</span>
                          <span className="text-xs font-medium">{driver?.full_name ?? 'Unassigned'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Select a day to view jobs</p>
              <p className="text-xs text-gray-400 mt-1">Dots indicate scheduled jobs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
