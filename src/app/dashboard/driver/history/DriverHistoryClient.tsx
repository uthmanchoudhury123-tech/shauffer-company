'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Star, Clock, CheckCircle2, Wallet, Search, Route, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

function haversine(lat1?: number | null, lng1?: number | null, lat2?: number | null, lng2?: number | null): number | null {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

interface HistoryJob {
  id: string
  pickup_address: string
  dropoff_address: string
  pickup_lat?: number | null
  pickup_lng?: number | null
  dropoff_lat?: number | null
  dropoff_lng?: number | null
  job_date: string
  job_time: string
  price: number
  status: string
  notes: string | null
  payment_status: string | null
  price_type: string | null
  job_type: string | null
}

interface Review { job_id: string; rating: number; comment: string | null }

interface Props {
  jobs: HistoryJob[]
  reviewMap: Record<string, Review>
}

export function DriverHistoryClient({ jobs, reviewMap }: Props) {
  const [search, setSearch] = useState('')

  const filtered = jobs.filter(j =>
    search === '' ||
    j.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
    j.dropoff_address.toLowerCase().includes(search.toLowerCase())
  )

  const totalEarnings = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.price ?? 0), 0)
  const paidJobs      = jobs.filter(j => j.payment_status === 'paid').length
  const avgRating     = (() => {
    const rated = Object.values(reviewMap)
    if (!rated.length) return null
    return (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)
  })()

  const priceLabel = (j: HistoryJob) => {
    if (j.job_type !== 'daily') return ''
    if (j.price_type === 'per_hour') return '/hr'
    if (j.price_type === 'per_day') return '/day'
    return ''
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All your completed and pending confirmation jobs</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Earned</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Payments Received</p>
          <p className="text-xl font-bold text-gray-900">{paidJobs}</p>
          <p className="text-xs text-gray-400 mt-0.5">{jobs.length - paidJobs} pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg Rating</p>
          <p className="text-xl font-bold text-gray-900">{avgRating ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{Object.keys(reviewMap).length} review{Object.keys(reviewMap).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No job history yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const review = reviewMap[job.id]
            const isPaid = job.payment_status === 'paid'
            const isAwaiting = job.status === 'awaiting_confirmation'
            const miles = haversine(job.pickup_lat, job.pickup_lng, job.dropoff_lat, job.dropoff_lng)

            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{job.pickup_address.split(',')[0]}</span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate">{job.dropoff_address.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(job.job_date)} {job.job_time}
                      </span>
                      {miles !== null && (
                        <span className="flex items-center gap-1">
                          <Route className="w-3 h-3" /> {miles.toFixed(1)} mi
                        </span>
                      )}
                    </div>
                    {/* Rating received */}
                    {review && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        {review.comment && (
                          <span className="text-xs text-gray-500 italic">"{review.comment}"</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(job.price)}{priceLabel(job) && <span className="text-xs font-normal text-gray-400">{priceLabel(job)}</span>}
                    </p>
                    <Link
                      href={`/dashboard/driver/invoice?job=${job.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <FileText className="w-3 h-3" /> Invoice
                    </Link>
                    {isAwaiting ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Awaiting confirmation
                      </span>
                    ) : isPaid ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <Wallet className="w-3 h-3" /> Paid to wallet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
