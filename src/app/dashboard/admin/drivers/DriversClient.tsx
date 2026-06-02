'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Search, CheckCircle, Star, UserCheck, UserX, UserPlus,
  Copy, Check, X, Mail, Link2, Heart, ShieldCheck, ShieldOff, AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { driverStatusColor, carTypeLabel, formatDate } from '@/lib/utils'
import type { Driver } from '@/types'

const CATEGORY_LABELS = {
  company: 'Company Driver',
  freelance: 'Freelance Driver',
}

interface PendingInvite {
  id: string
  email: string | null
  status: string
  created_at: string
  expires_at: string
}

interface DriversClientProps {
  drivers: Driver[]
  companyId: string
  pendingInvites: PendingInvite[]
  preferredDriverIds: string[]
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr?: string | null }) {
  const days = daysUntil(dateStr)
  if (days === null || days > 60) return null
  const isExpired = days <= 0
  const isUrgent  = days <= 14
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      isExpired ? 'bg-red-100 text-red-700' :
      isUrgent  ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-50 text-yellow-700'
    }`}>
      <AlertTriangle className="w-2.5 h-2.5" />
      {label} {isExpired ? 'expired' : `exp. ${formatDate(dateStr!)}`}
    </span>
  )
}

export function DriversClient({
  drivers,
  companyId,
  pendingInvites: initialInvites,
  preferredDriverIds: initialPreferred,
}: DriversClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'company' | 'freelance'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'on_job' | 'offline'>('all')
  const [preferredIds, setPreferredIds] = useState<string[]>(initialPreferred)
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(drivers.map(d => [d.id, d.is_verified]))
  )

  // Invite state
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialInvites)

  const filtered = drivers.filter(d => {
    const matchSearch = d.full_name.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || d.driver_category === categoryFilter
    const matchStatus = statusFilter === 'all' || d.availability_status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  const companyCount   = drivers.filter(d => d.driver_category === 'company').length
  const freelanceCount = drivers.filter(d => d.driver_category === 'freelance').length
  const availableCount = drivers.filter(d => d.availability_status === 'available').length

  // Count drivers with expiring licences (within 30 days)
  const expiryAlerts = drivers.filter(d => {
    const fields = [(d as any).tfl_licence_expiry, (d as any).hertz_licence_expiry, d.licence_expiry]
    return fields.some(f => { const days = daysUntil(f); return days !== null && days <= 30 })
  }).length

  async function togglePreferred(driverId: string) {
    const isPreferred = preferredIds.includes(driverId)
    const res = await fetch('/api/drivers/prefer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, preferred: !isPreferred }),
    })
    if (res.ok) {
      setPreferredIds(prev =>
        isPreferred ? prev.filter(id => id !== driverId) : [...prev, driverId]
      )
    }
  }

  async function toggleVerified(driverId: string) {
    const current = verifiedMap[driverId] ?? false
    const res = await fetch('/api/admin/drivers/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, verified: !current }),
    })
    if (res.ok) {
      setVerifiedMap(prev => ({ ...prev, [driverId]: !current }))
    }
  }

  async function handleInvite() {
    setInviting(true)
    setInviteError('')
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    if (!res.ok) { setInviteError(data.error ?? 'Failed to create invite'); setInviting(false); return }
    setInviteLink(data.link)
    setInviting(false)
    setPendingInvites(prev => [{
      id: Date.now().toString(), email: inviteEmail || null, status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }, ...prev])
  }

  async function handleCancelInvite(id: string) {
    await fetch('/api/invite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPendingInvites(prev => prev.filter(i => i.id !== id))
    router.refresh()
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function closeInviteModal() {
    setInviteModal(false)
    setInviteEmail('')
    setInviteLink('')
    setInviteError('')
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} — {availableCount} available
          </p>
        </div>
        <button
          onClick={() => setInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Driver
        </button>
      </div>

      {/* Expiry alert banner */}
      {expiryAlerts > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            <span className="font-semibold">{expiryAlerts} driver{expiryAlerts !== 1 ? 's' : ''}</span> {expiryAlerts !== 1 ? 'have' : 'has'} licences expiring within 30 days.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: UserCheck, color: 'blue',   count: companyCount,   label: 'Company Drivers' },
          { icon: UserX,     color: 'purple', count: freelanceCount,  label: 'Freelance Drivers' },
          { icon: Users,     color: 'green',  count: availableCount,  label: 'Available Now' },
        ].map(({ icon: Icon, color, count, label }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 bg-${color}-50 rounded-lg flex items-center justify-center text-${color}-600`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Pending Invites ({pendingInvites.length})
          </h2>
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    {invite.email ?? <span className="text-gray-400 italic">No email — link only</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Expires {new Date(invite.expires_at).toLocaleDateString('en-GB')}</p>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="company">Company Drivers</option>
          <option value="freelance">Freelance Drivers</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="on_job">On Job</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Driver Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-3">
            {search || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No drivers match your filters.'
              : 'No drivers yet.'}
          </p>
          {!search && categoryFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => setInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite your first driver
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <DriverCard
              key={driver.id}
              driver={driver}
              isPreferred={preferredIds.includes(driver.id)}
              isVerified={verifiedMap[driver.id] ?? driver.is_verified}
              onTogglePreferred={() => togglePreferred(driver.id)}
              onToggleVerified={() => toggleVerified(driver.id)}
            />
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={inviteModal} onClose={closeInviteModal} title="Invite a Driver" size="sm">
        {!inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Generate an invite link to share with your driver. They'll sign up and automatically join your company.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Driver's Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="driver@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">If provided, pre-fills their signup form.</p>
            </div>
            {inviteError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={closeInviteModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {inviting ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-medium">Invite link created — valid for 7 days</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Share this link</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 truncate font-mono">
                  {inviteLink}
                </div>
                <button
                  onClick={() => copyLink(inviteLink)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Share via WhatsApp, email, or SMS
              </p>
            </div>
            <button
              onClick={closeInviteModal}
              className="w-full py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DriverCard({
  driver, isPreferred, isVerified, onTogglePreferred, onToggleVerified,
}: {
  driver: Driver
  isPreferred: boolean
  isVerified: boolean
  onTogglePreferred: () => void
  onToggleVerified: () => void
}) {
  const stars = Math.round(driver.rating)
  const d = driver as any

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {driver.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driver.photo_url} alt={driver.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 font-semibold text-lg">{driver.full_name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{driver.full_name}</h3>
            {isVerified && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" aria-label="Verified" />}
            {isPreferred && <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 flex-shrink-0" aria-label="Preferred" />}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={`w-3 h-3 ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
            ))}
            <span className="text-xs text-gray-400 ml-1">
              {driver.rating > 0 ? `${driver.rating.toFixed(1)} (${driver.rating_count})` : 'No ratings'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Preferred toggle — freelance only */}
          {driver.driver_category === 'freelance' && (
            <button
              onClick={onTogglePreferred}
              title={isPreferred ? 'Remove from preferred' : 'Mark as preferred'}
              className={`p-1.5 rounded-lg transition-colors ${
                isPreferred
                  ? 'text-pink-500 bg-pink-50 hover:bg-pink-100'
                  : 'text-gray-300 hover:text-pink-400 hover:bg-pink-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${isPreferred ? 'fill-pink-500' : ''}`} />
            </button>
          )}
          {/* Verify toggle */}
          <button
            onClick={onToggleVerified}
            title={isVerified ? 'Remove verification' : 'Verify driver'}
            className={`p-1.5 rounded-lg transition-colors ${
              isVerified
                ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-300 hover:text-blue-400 hover:bg-blue-50'
            }`}
          >
            {isVerified ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Status</span>
          <Badge className={driverStatusColor(driver.availability_status)}>
            {driver.availability_status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Category</span>
          <span className="text-gray-700 font-medium">{CATEGORY_LABELS[driver.driver_category]}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Car Type</span>
          <span className="text-gray-700">{carTypeLabel(driver.car_type)}</span>
        </div>
      </div>

      {/* Licence expiry warnings */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        <ExpiryBadge label="DVLA" dateStr={driver.licence_expiry} />
        <ExpiryBadge label="TFL"  dateStr={d.tfl_licence_expiry} />
        <ExpiryBadge label="Hertz" dateStr={d.hertz_licence_expiry} />
      </div>
    </div>
  )
}
