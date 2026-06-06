'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe, Briefcase, MapPin, Clock, CheckCircle, Star,
  AlertCircle, PlayCircle, NavigationOff, Navigation,
  TrendingUp, Wallet, ChevronRight, FileText, User, AlertTriangle,
  Route, Plus, Package, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { PushNotificationSetup } from '@/components/PushNotificationSetup'
import { jobStatusColor, formatDate, formatCurrency, carTypeLabel } from '@/lib/utils'
import type { Job, AvailabilityStatus } from '@/types'

function haversine(lat1?: number | null, lng1?: number | null, lat2?: number | null, lng2?: number | null): number | null {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface DriverProfile {
  availability_status: string
  rating: number
  rating_count: number
  is_verified: boolean
  car_type: string
  photo_url?: string | null
  licence_number?: string | null
  licence_expiry?: string | null
  tfl_licence_expiry?: string | null
  hertz_licence_expiry?: string | null
}

interface PostedJob {
  id: string
  job_date: string
  job_time: string
  pickup_address: string
  dropoff_address: string
  price: number
  status: string
  applications_count?: number
}

interface Props {
  driverName: string
  driverProfile: DriverProfile | null
  assignedJobs: Job[]          // jobs where driver_id = this driver (won bids / direct assign)
  postedJobs: PostedJob[]      // jobs this freelancer posted for others
  marketplaceCount: number     // open marketplace jobs available to bid on
  driverId: string
  walletBalance: number
}

export function FreelanceDashboardClient({
  driverName,
  driverProfile,
  assignedJobs: initialAssigned,
  postedJobs: initialPosted,
  marketplaceCount,
  driverId,
  walletBalance,
}: Props) {
  const router = useRouter()
  const [assignedJobs, setAssignedJobs] = useState<Job[]>(initialAssigned)
  const [postedJobs] = useState<PostedJob[]>(initialPosted)
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    (driverProfile?.availability_status as AvailabilityStatus) ?? 'offline'
  )
  const [updatingAvailability, setUpdatingAvailability] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const [locationSharing, setLocationSharing] = useState(false)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

  // Job buckets
  const upcomingJobs = assignedJobs.filter(j => j.status === 'assigned')
  const activeJob = assignedJobs.find(j => j.status === 'in_progress' || j.status === 'awaiting_confirmation')
  const completedJobs = assignedJobs.filter(j => j.status === 'completed')

  // Earnings (from assigned/won jobs)
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const earningsToday = completedJobs.filter(j => j.job_date === today).reduce((s, j) => s + (j.price ?? 0), 0)
  const earningsWeek = completedJobs.filter(j => j.job_date >= weekAgo).reduce((s, j) => s + (j.price ?? 0), 0)

  const nextJob = upcomingJobs[0]
  function getCountdown(job: Job) {
    const d = new Date(`${job.job_date}T${job.job_time}`)
    const diff = d.getTime() - Date.now()
    if (diff <= 0) return 'Now'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  async function updateAvailability(status: AvailabilityStatus) {
    setUpdatingAvailability(true)
    const supabase = createClient()
    await supabase.from('drivers').update({ availability_status: status }).eq('id', driverId)
    setAvailability(status)
    setUpdatingAvailability(false)
  }

  async function updateJobStatus(jobId: string, status: Job['status']) {
    const supabase = createClient()
    const actualStatus = status === 'completed' ? 'awaiting_confirmation' : status
    const { data } = await supabase.from('jobs').update({ status: actualStatus }).eq('id', jobId).select().single()
    if (data) {
      setAssignedJobs(prev => prev.map(j => j.id === jobId ? data : j))
      if (actualStatus === 'in_progress') await updateAvailability('on_job')
      if (actualStatus === 'awaiting_confirmation') {
        const remaining = assignedJobs.filter(j => j.id !== jobId && j.status === 'in_progress')
        if (remaining.length === 0) await updateAvailability('available')
      }
    }
    router.refresh()
  }

  function startLocationSharing() {
    if (!navigator.geolocation) return
    setLocationError('')
    const id = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const supabase = createClient()
        await supabase.from('drivers').update({
          current_lat: coords.latitude, current_lng: coords.longitude,
          location_updated_at: new Date().toISOString(),
        }).eq('id', driverId)
      },
      () => { setLocationError('Location access denied.'); stopLocationSharing() },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    watchIdRef.current = id
    setLocationSharing(true)
  }

  function stopLocationSharing() {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
    setLocationSharing(false)
    const supabase = createClient()
    supabase.from('drivers').update({ current_lat: null, current_lng: null }).eq('id', driverId)
  }

  const availabilityConfig = {
    available: { label: 'Available', color: 'bg-green-500', bg: 'bg-green-100 text-green-800 border-green-200' },
    on_job:    { label: 'On Job',    color: 'bg-blue-500',  bg: 'bg-blue-100 text-blue-800 border-blue-200' },
    offline:   { label: 'Offline',   color: 'bg-gray-400',  bg: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const currentStatus = availabilityConfig[availability] ?? availabilityConfig.offline

  // Licence expiry alerts
  const licenceAlerts: { label: string; expiry: string | null | undefined }[] = [
    { label: 'DVLA Licence',  expiry: driverProfile?.licence_expiry },
    { label: 'TFL Licence',   expiry: driverProfile?.tfl_licence_expiry },
    { label: 'Hertz Licence', expiry: driverProfile?.hertz_licence_expiry },
  ].filter(({ expiry }) => {
    if (!expiry) return false
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    return days <= 60
  })

  const openPostedJobs = postedJobs.filter(j => j.status === 'open' || j.status === 'pending')
  const activePostedJobs = postedJobs.filter(j => j.status === 'in_progress' || j.status === 'assigned')

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-5">

      {/* Licence alerts */}
      {licenceAlerts.map(({ label, expiry }) => {
        const days = Math.ceil((new Date(expiry!).getTime() - Date.now()) / 86400000)
        const expired = days <= 0
        const urgent  = days <= 14
        return (
          <div key={label} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
            expired ? 'bg-red-50 border-red-200 text-red-700' :
            urgent  ? 'bg-orange-50 border-orange-200 text-orange-700' :
                      'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="font-semibold">
              {expired ? `${label} expired` : `${label} expiring in ${days} day${days !== 1 ? 's' : ''}`}
            </p>
          </div>
        )
      })}

      {/* Profile header */}
      <div className="bg-gradient-to-br from-purple-900 to-gray-900 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {driverProfile?.photo_url ? (
              <img src={driverProfile.photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-white/20" alt="Profile" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold border-2 border-white/20">
                {driverName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{driverName}</h1>
                {driverProfile?.is_verified && <CheckCircle className="w-4 h-4 text-purple-300" />}
                <span className="bg-purple-500/30 text-purple-200 text-xs font-medium px-2 py-0.5 rounded-full border border-purple-400/30">
                  Freelance
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-3 h-3 ${n <= Math.round(driverProfile?.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 fill-white/20'}`} />
                ))}
                <span className="text-xs text-white/60 ml-1">
                  {(driverProfile?.rating ?? 0) > 0 ? `${driverProfile?.rating?.toFixed(1)} (${driverProfile?.rating_count})` : 'No ratings yet'}
                </span>
              </div>
              {driverProfile?.car_type && (
                <p className="text-xs text-white/50 mt-0.5">{carTypeLabel(driverProfile.car_type)}</p>
              )}
            </div>
          </div>
          {/* Availability */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentStatus.color} ${availability === 'available' ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium text-white/80">{currentStatus.label}</span>
            </div>
            {availability !== 'on_job' && (
              <div className="flex gap-1.5">
                {(['available', 'offline'] as AvailabilityStatus[]).map(s => (
                  <button
                    key={s}
                    disabled={updatingAvailability || availability === s}
                    onClick={() => updateAvailability(s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
                      ${availability === s ? availabilityConfig[s].bg : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/80'}
                      disabled:opacity-40`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location + notifications row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={locationSharing ? stopLocationSharing : startLocationSharing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${locationSharing ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-white/10 text-white/60 border border-white/20 hover:bg-white/20'}`}
            >
              {locationSharing ? <><NavigationOff className="w-3.5 h-3.5" /> Stop Location</> : <><Navigation className="w-3.5 h-3.5" /> Share Location</>}
            </button>
            {locationSharing && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />Live
              </span>
            )}
            {locationError && <p className="text-xs text-red-400">{locationError}</p>}
          </div>
          <PushNotificationSetup />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2">
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(walletBalance)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Wallet balance</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(earningsWeek)}</p>
          <p className="text-xs text-gray-400 mt-0.5">This week</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-2">
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{completedJobs.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Jobs won</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/dashboard/driver/post-job"
          className="flex items-center justify-between bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 transition-colors">
          <div>
            <p className="font-semibold text-sm">Post a Job</p>
            <p className="text-xs text-purple-200 mt-0.5">Outsource to other drivers</p>
          </div>
          <Plus className="w-5 h-5 text-purple-200" />
        </a>
        <a href="/dashboard/driver/available-jobs"
          className="flex items-center justify-between bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 transition-colors">
          <div>
            <p className="font-semibold text-sm text-gray-800">Browse Jobs</p>
            <p className="text-xs text-gray-400 mt-0.5">{marketplaceCount} available now</p>
          </div>
          <div className="flex items-center gap-1">
            {marketplaceCount > 0 && (
              <span className="bg-blue-600 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center">
                {marketplaceCount > 99 ? '99+' : marketplaceCount}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </a>
      </div>

      {/* Active job (prominent) */}
      {activeJob && (
        <div className="bg-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5" />
            <span className="font-bold">Job In Progress</span>
          </div>
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 text-sm text-purple-100">
              <MapPin className="w-4 h-4 flex-shrink-0" />{activeJob.pickup_address}
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 flex-shrink-0" />{activeJob.dropoff_address}
            </div>
          </div>
          {activeJob.notes && <p className="text-sm text-purple-200 italic mb-4">"{activeJob.notes}"</p>}
          <div className="flex gap-2">
            {activeJob.status === 'awaiting_confirmation' ? (
              <span className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl text-sm font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Awaiting Confirmation
              </span>
            ) : (
              <button
                onClick={() => updateJobStatus(activeJob.id, 'completed')}
                className="px-4 py-2 bg-white text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-50"
              >
                ✓ Mark Complete
              </button>
            )}
            <a
              href={`/dashboard/driver/sign?job=${activeJob.id}`}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-400 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Meet &amp; Greet Sign
            </a>
          </div>
        </div>
      )}

      {/* Next upcoming job */}
      {nextJob && !activeJob && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Job</p>
            <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              In {getCountdown(nextJob)}
            </span>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="font-medium text-gray-800 truncate">{nextJob.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-gray-600 truncate">{nextJob.dropoff_address}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDate(nextJob.job_date)} at {nextJob.job_time}</span>
              {nextJob.price > 0 && <span className="font-semibold text-gray-700">{formatCurrency(nextJob.price)}</span>}
            </div>
            <button
              onClick={() => updateJobStatus(nextJob.id, 'in_progress')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium"
            >
              Start Job
            </button>
          </div>
        </div>
      )}

      {/* My posted jobs */}
      {(openPostedJobs.length > 0 || activePostedJobs.length > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" /> Jobs I Posted
          </h2>
          <div className="space-y-2">
            {[...activePostedJobs, ...openPostedJobs].map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {job.pickup_address} → {job.dropoff_address}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(job.job_date)} at {job.job_time}</span>
                      {job.price > 0 && <span className="font-semibold text-gray-600">{formatCurrency(job.price)}</span>}
                      {(job.applications_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Users className="w-3 h-3" />{job.applications_count} applicant{job.applications_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={jobStatusColor(job.status)}>{job.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
          <a href="/dashboard/driver/post-job" className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800">
            <Plus className="w-3.5 h-3.5" /> Post another job
          </a>
        </div>
      )}

      {/* Empty state */}
      {upcomingJobs.length === 0 && !activeJob && openPostedJobs.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
          <Globe className="w-9 h-9 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">No active jobs</p>
          <p className="text-xs text-gray-400 mt-1">Browse the marketplace or post a job for another driver</p>
          {marketplaceCount > 0 && (
            <a href="/dashboard/driver/available-jobs" className="mt-3 inline-block text-xs text-purple-600 hover:underline">
              {marketplaceCount} job{marketplaceCount !== 1 ? 's' : ''} available to bid on →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
