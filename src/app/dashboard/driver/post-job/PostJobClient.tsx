'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MapPin, X, Search, Globe, User2, Briefcase, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { carTypeLabel } from '@/lib/utils'
import type { CarType } from '@/types'

const CAR_TYPES: CarType[] = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']

interface DriverSearchResult {
  id: string
  full_name: string
  car_type: string
  driver_category: string
  company_name: string | null
}

interface PostJobClientProps {
  driverId: string
  companyId: string | null
  driverName: string
}

const emptyForm = {
  route_legs: ['', ''] as string[],
  job_date: new Date().toISOString().split('T')[0],
  job_time: '09:00',
  end_time: '',
  price: '',
  preferred_car_type: '' as CarType | '',
  notes: '',
  client_name: '',
  client_phone: '',
  visibility: 'platform' as 'platform' | 'direct',
  open_for_applications: true,
  allow_counter_offer: true,
  target_drivers: [] as DriverSearchResult[],
}

export function PostJobClient({ driverId, companyId, driverName }: PostJobClientProps) {
  const router = useRouter()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Driver search for direct targeting
  const [driverSearchQ, setDriverSearchQ] = useState('')
  const [driverSearchResults, setDriverSearchResults] = useState<DriverSearchResult[]>([])
  const [searchingDrivers, setSearchingDrivers] = useState(false)

  async function searchDrivers(q: string) {
    setDriverSearchQ(q)
    if (q.length < 2) { setDriverSearchResults([]); return }
    setSearchingDrivers(true)
    const res = await fetch(`/api/drivers/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    // Don't show yourself in results
    setDriverSearchResults((data as DriverSearchResult[]).filter((d) => d.id !== driverId))
    setSearchingDrivers(false)
  }

  function addTargetDriver(d: DriverSearchResult) {
    if (form.target_drivers.find(t => t.id === d.id)) return
    setForm(f => ({ ...f, target_drivers: [...f.target_drivers, d] }))
    setDriverSearchQ('')
    setDriverSearchResults([])
  }

  function removeTargetDriver(id: string) {
    setForm(f => ({ ...f, target_drivers: f.target_drivers.filter(d => d.id !== id) }))
  }

  function updateLeg(idx: number, value: string) {
    setForm(f => {
      const legs = [...f.route_legs]
      legs[idx] = value
      return { ...f, route_legs: legs }
    })
  }

  function addLeg() {
    setForm(f => ({ ...f, route_legs: [...f.route_legs, ''] }))
  }

  function removeLeg(idx: number) {
    setForm(f => {
      if (f.route_legs.length <= 2) return f
      return { ...f, route_legs: f.route_legs.filter((_, i) => i !== idx) }
    })
  }

  async function handlePost() {
    const stops = form.route_legs.map(s => s.trim()).filter(Boolean)
    if (stops.length < 2) {
      setError('Please fill in at least a pickup and drop-off address.')
      return
    }
    if (form.visibility === 'direct' && form.target_drivers.length === 0) {
      setError('Please search and add at least one driver to send this job to.')
      return
    }

    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      company_id: companyId ?? null,
      created_by: driverId,
      posted_by_driver_id: driverId,
      pickup_address: stops[0],
      dropoff_address: stops[stops.length - 1],
      route_legs: stops,
      job_date: form.job_date,
      job_time: form.job_time,
      end_time: form.end_time || null,
      job_type: 'standard',
      price: Number(form.price) || 0,
      price_type: 'fixed',
      preferred_car_type: form.preferred_car_type || null,
      notes: form.notes || null,
      status: 'pending',
      driver_id: null,
      open_for_applications: form.visibility === 'direct' ? false : form.open_for_applications,
      visibility: form.visibility,
      target_driver_ids: form.visibility === 'direct' ? form.target_drivers.map(d => d.id) : [],
      allow_counter_offer: form.allow_counter_offer,
      client_name: form.client_name || null,
      client_phone: form.client_phone || null,
    }

    const { error: err } = await supabase.from('jobs').insert(payload)

    if (err) { setError(err.message); setSaving(false); return }

    setSuccess(true)
    setSaving(false)
    setForm(emptyForm)
    setTimeout(() => { setSuccess(false); router.refresh() }, 3000)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Post a Job</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Have a booking to subcontract? Post it to the platform and let drivers apply.
        </p>
      </div>

      {success && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Job posted successfully!</p>
            <p className="text-xs text-green-600">Drivers will be able to see and apply for it shortly.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

        {/* Route */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Route *</label>
            <span className="text-xs text-gray-400">{form.route_legs.length - 1} leg{form.route_legs.length - 1 !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {form.route_legs.map((stop, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5 w-5 flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    idx === 0 ? 'border-green-500 bg-green-500' :
                    idx === form.route_legs.length - 1 ? 'border-red-500 bg-red-500' :
                    'border-blue-400 bg-blue-400'
                  }`} />
                  {idx < form.route_legs.length - 1 && <div className="w-0.5 h-4 bg-gray-200" />}
                </div>
                <div className="flex-1">
                  <LocationAutocomplete
                    value={stop}
                    onChange={v => updateLeg(idx, v)}
                    placeholder={
                      idx === 0 ? 'Pickup address...' :
                      idx === form.route_legs.length - 1 ? 'Drop-off address...' :
                      `Stop ${idx + 1}...`
                    }
                  />
                </div>
                {form.route_legs.length > 2 && (
                  <button type="button" onClick={() => removeLeg(idx)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLeg}
            className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Stop
          </button>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <input type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.job_date}
              onChange={e => setForm(f => ({ ...f, job_date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Time *</label>
            <input type="time"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.job_time}
              onChange={e => setForm(f => ({ ...f, job_time: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
            <input type="time"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
        </div>

        {/* Price & Car Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Driver Pay (£)</label>
            <input type="number" min="0" step="0.01"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Car Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.preferred_car_type}
              onChange={e => setForm(f => ({ ...f, preferred_car_type: e.target.value as CarType }))}>
              <option value="">Any</option>
              {CAR_TYPES.map(t => <option key={t} value={t}>{carTypeLabel(t)}</option>)}
            </select>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Who can see this job?</label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'platform', icon: Globe,  label: 'All Drivers',     desc: 'Posted to marketplace' },
              { key: 'direct',   icon: User2,  label: 'Specific Driver', desc: 'Send directly by name' },
            ] as const).map(({ key, icon: Icon, label, desc }) => (
              <button key={key} type="button"
                onClick={() => setForm(f => ({ ...f, visibility: key, target_drivers: [] }))}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors ${
                  form.visibility === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="font-semibold">{label}</span>
                <span className="text-gray-400">{desc}</span>
              </button>
            ))}
          </div>

          {/* Direct driver search */}
          {form.visibility === 'direct' && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search driver by name..."
                  value={driverSearchQ}
                  onChange={e => searchDrivers(e.target.value)} />
                {searchingDrivers && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>}
              </div>
              {driverSearchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {driverSearchResults.map(d => (
                    <button key={d.id} type="button" onClick={() => addTargetDriver(d)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-100 last:border-0">
                      <span className="font-medium text-gray-800">{d.full_name}</span>
                      <span className="text-xs text-gray-400">{d.company_name ?? 'Freelancer'}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.target_drivers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.target_drivers.map(d => (
                    <span key={d.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                      {d.full_name}
                      <button type="button" onClick={() => removeTargetDriver(d.id)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {form.target_drivers.length === 0 && (
                <p className="text-xs text-amber-600">Search and add at least one driver to target</p>
              )}
            </div>
          )}
        </div>

        {/* Open for applications + counter offers */}
        {form.visibility === 'platform' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-lg border border-blue-100">
              <div>
                <p className="text-sm font-medium text-blue-900">Open for Applications</p>
                <p className="text-xs text-blue-600 mt-0.5">Drivers can apply — you pick who gets the job</p>
              </div>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, open_for_applications: !f.open_for_applications }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.open_for_applications ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  form.open_for_applications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {form.open_for_applications && (
              <div className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-lg border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-amber-900">Allow Counter Offers</p>
                  <p className="text-xs text-amber-600 mt-0.5">Drivers can propose a different price</p>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, allow_counter_offer: !f.allow_counter_offer }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.allow_counter_offer ? 'bg-amber-500' : 'bg-gray-200'
                  }`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    form.allow_counter_offer ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Client details */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Client Details <span className="font-normal text-gray-400">(optional)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Name</label>
              <input type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="e.g. John Smith" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Phone</label>
              <input type="tel"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.client_phone}
                onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                placeholder="+44 7700 000000" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Special instructions, flight number, meet & greet info..." />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handlePost}
            disabled={
              saving ||
              form.route_legs.filter(s => s.trim()).length < 2 ||
              (form.visibility === 'direct' && form.target_drivers.length === 0)
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            {saving ? 'Posting...' : 'Post Job'}
          </button>
          <button type="button" onClick={() => setForm(emptyForm)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
