'use client'

import { useState } from 'react'
import { History, MapPin, Banknote, CheckCircle2, TrendingUp } from 'lucide-react'

interface CompletedJob {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  price: number
  status: string
  created_at: string
  funds_released?: boolean
  poster?: { id: string; full_name: string } | null
  driver?: { id: string; full_name: string } | null
}

interface Props {
  postedCompleted: CompletedJob[]
  doneCompleted: CompletedJob[]
  balance: number
  driverId: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function HistoryClient({ postedCompleted, doneCompleted, balance }: Props) {
  const [tab, setTab] = useState<'done' | 'posted'>('done')

  const totalEarned = doneCompleted.filter(j => j.funds_released).reduce((sum, j) => sum + j.price, 0)
  const totalPosted = postedCompleted.length

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Job History</h1>
        <p className="text-gray-400 text-sm mt-1">Your completed work record</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <p className="text-gray-400 text-xs">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-green-400">£{totalEarned.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-0.5">{doneCompleted.length} jobs completed</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <p className="text-gray-400 text-xs">Jobs Posted</p>
          </div>
          <p className="text-2xl font-bold text-white">{totalPosted}</p>
          <p className="text-gray-500 text-xs mt-0.5">completed by others</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg mb-5 border border-gray-800 w-fit">
        {(['done', 'posted'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'done' ? 'Jobs I Completed' : 'Jobs I Posted'}
          </button>
        ))}
      </div>

      {/* Job list */}
      {tab === 'done' && (
        <JobList jobs={doneCompleted} type="done" empty="You haven't completed any jobs yet" />
      )}
      {tab === 'posted' && (
        <JobList jobs={postedCompleted} type="posted" empty="You haven't posted any completed jobs" />
      )}
    </div>
  )
}

function JobList({ jobs, type, empty }: { jobs: CompletedJob[], type: 'done' | 'posted', empty: string }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="w-10 h-10 text-gray-700 mb-3" />
        <p className="text-gray-400">{empty}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {jobs.map(job => (
        <div key={job.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-xs text-gray-500">{formatDate(job.job_date)}</span>
                {type === 'done' && job.funds_released && (
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                    Paid
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <p className="text-white text-sm truncate">{job.pickup_address}</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <p className="text-gray-400 text-sm truncate">{job.dropoff_address}</p>
                </div>
              </div>
              {type === 'done' && job.poster && (
                <p className="text-gray-500 text-xs mt-2">Posted by {job.poster.full_name}</p>
              )}
              {type === 'posted' && job.driver && (
                <p className="text-gray-500 text-xs mt-2">Completed by {job.driver.full_name}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-bold text-lg ${type === 'done' ? 'text-green-400' : 'text-white'}`}>
                £{job.price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
