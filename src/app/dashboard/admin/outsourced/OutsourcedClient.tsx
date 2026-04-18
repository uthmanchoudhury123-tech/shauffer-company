'use client'

import { useState } from 'react'
import { Send, Clock, CheckCircle2, XCircle, Users, MapPin, Calendar, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Job {
  id: string
  job_date: string
  job_time: string
  pickup_address: string
  dropoff_address: string
  status: string
  is_outsourced?: boolean
  outsourced_note?: string
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  assigned:    'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-red-100 text-red-800',
}

export function OutsourcedClient({
  outsourcedJobs,
  unassignedJobs,
  companyId,
  adminId,
}: {
  outsourcedJobs: Job[]
  unassignedJobs: Job[]
  companyId: string
  adminId: string
}) {
  const [tab, setTab] = useState<'posted' | 'post'>('posted')
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [posted, setPosted] = useState<Job[]>(outsourcedJobs)
  const [unassigned, setUnassigned] = useState<Job[]>(unassignedJobs)
  const [success, setSuccess] = useState('')

  async function postToFreelancers(jobId: string) {
    setLoading(jobId)
    const supabase = createClient()
    const { error } = await supabase
      .from('jobs')
      .update({ is_outsourced: true, outsourced_note: note })
      .eq('id', jobId)

    if (!error) {
      const job = unassigned.find(j => j.id === jobId)
      if (job) {
        setPosted(prev => [{ ...job, is_outsourced: true, outsourced_note: note }, ...prev])
        setUnassigned(prev => prev.filter(j => j.id !== jobId))
      }
      setSelectedJob(null)
      setNote('')
      setSuccess('Job posted to freelancers!')
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(null)
  }

  async function cancelOutsource(jobId: string) {
    setLoading(jobId)
    const supabase = createClient()
    const { error } = await supabase
      .from('jobs')
      .update({ is_outsourced: false, outsourced_note: null })
      .eq('id', jobId)

    if (!error) {
      const job = posted.find(j => j.id === jobId)
      if (job) {
        setUnassigned(prev => [{ ...job, is_outsourced: false }, ...prev])
        setPosted(prev => prev.filter(j => j.id !== jobId))
      }
    }
    setLoading(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outsourced Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Post unassigned jobs to the freelance driver marketplace</p>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{posted.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Posted to Freelancers</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{unassigned.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unassigned Jobs</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {posted.filter(j => j.status === 'assigned' || j.status === 'in_progress' || j.status === 'completed').length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Picked Up by Freelancers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['posted', 'post'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'posted' ? `Posted Jobs (${posted.length})` : `Post New Job (${unassigned.length})`}
          </button>
        ))}
      </div>

      {/* Posted jobs */}
      {tab === 'posted' && (
        <div className="space-y-3">
          {posted.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No outsourced jobs yet</p>
              <p className="text-gray-400 text-xs mt-1">Switch to "Post New Job" to outsource a job to freelancers</p>
            </div>
          ) : (
            posted.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Outsourced</span>
                    </div>
                    <div className="flex items-start gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-800 truncate">{job.pickup_address} → {job.dropoff_address}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-xs text-gray-500">{job.job_date} at {job.job_time}</p>
                    </div>
                    {job.outsourced_note && (
                      <p className="text-xs text-gray-400 mt-2 italic">"{job.outsourced_note}"</p>
                    )}
                  </div>
                  {job.status === 'pending' && (
                    <button
                      onClick={() => cancelOutsource(job.id)}
                      disabled={loading === job.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 flex-shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {loading === job.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Post new job */}
      {tab === 'post' && (
        <div className="space-y-3">
          {unassigned.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No unassigned jobs</p>
              <p className="text-gray-400 text-xs mt-1">All pending jobs are either assigned or already outsourced</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Posting a job to freelancers makes it visible on the freelancer marketplace.
                  Any verified freelance driver can then accept it.
                </p>
              </div>
              {unassigned.map(job => (
                <div key={job.id} className={`bg-white rounded-xl border transition-all ${selectedJob === job.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-800 truncate">{job.pickup_address} → {job.dropoff_address}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs text-gray-500">{job.job_date} at {job.job_time}</p>
                        </div>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Unassigned</span>
                    </div>
                  </div>

                  {selectedJob === job.id && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Add a note for freelancers (optional)
                      </label>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="e.g. VIP client, please be punctual. Smart dress required."
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => postToFreelancers(job.id)}
                          disabled={loading === job.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {loading === job.id ? 'Posting...' : 'Post to Freelancers'}
                        </button>
                        <button
                          onClick={() => { setSelectedJob(null); setNote('') }}
                          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
