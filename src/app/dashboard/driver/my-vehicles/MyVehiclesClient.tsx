'use client'

import { useState, useRef } from 'react'
import { Plus, Car, Trash2, CheckCircle2, Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { carTypeLabel } from '@/lib/utils'

const CAR_TYPES = ['saloon','estate','suv','mpv','minibus','executive','van']

interface Vehicle {
  id: string
  make: string
  model: string
  year: number | null
  registration: string
  color: string | null
  car_type: string
  photo_url: string | null
  photo_outside: string | null
  photo_inside: string | null
  is_active: boolean
}

const empty = {
  make: '', model: '', year: '', registration: '', color: '', car_type: 'saloon',
  photo_outside: '', photo_inside: '',
}

export function MyVehiclesClient({
  vehicles: initial,
  driverId,
  companyId,
}: {
  vehicles: Vehicle[]
  driverId: string
  companyId: string
}) {
  const [vehicles, setVehicles] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingSlot, setUploadingSlot] = useState<'outside' | 'inside' | null>(null)
  const [uploadError, setUploadError] = useState('')
  const outsideInputRef = useRef<HTMLInputElement>(null)
  const insideInputRef  = useRef<HTMLInputElement>(null)

  async function handleSlotUpload(e: React.ChangeEvent<HTMLInputElement>, slot: 'outside' | 'inside') {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSlot(slot)
    setUploadError('')
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `driver-vehicles/${driverId}/${slot}-${Date.now()}-${safeName}`
    const { data, error: upErr } = await supabase.storage
      .from('vehicles')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setUploadError(`Upload failed: ${upErr.message}`); setUploadingSlot(null); return }
    const { data: urlData } = supabase.storage.from('vehicles').getPublicUrl(path)
    setForm(f => ({ ...f, [slot === 'outside' ? 'photo_outside' : 'photo_inside']: urlData.publicUrl }))
    setUploadingSlot(null)
    e.target.value = ''
  }

  async function handleSave() {
    if (!form.make || !form.model || !form.registration) {
      setError('Make, model and registration are required')
      return
    }
    if (!form.photo_outside) { setError('Please upload an outside photo of the vehicle.'); return }
    if (!form.photo_inside)  { setError('Please upload an inside photo of the vehicle.'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('company_driver_vehicles')
      .insert({
        driver_id: driverId,
        company_id: companyId,
        make: form.make,
        model: form.model,
        year: form.year ? Number(form.year) : null,
        registration: form.registration.toUpperCase(),
        color: form.color || null,
        car_type: form.car_type,
        photo_url: form.photo_outside || null,
        photo_outside: form.photo_outside || null,
        photo_inside: form.photo_inside || null,
      })
      .select()
      .single()

    if (err) { setError(err.message) }
    else if (data) {
      setVehicles(v => [data, ...v])
      setShowForm(false)
      setForm(empty)
    }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('company_driver_vehicles').update({ is_active: !current }).eq('id', id)
    setVehicles(v => v.map(veh => veh.id === id ? { ...veh, is_active: !current } : veh))
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this vehicle?')) return
    const supabase = createClient()
    await supabase.from('company_driver_vehicles').delete().eq('id', id)
    setVehicles(v => v.filter(veh => veh.id !== id))
  }

  const canSave = !!form.make && !!form.model && !!form.registration && !!form.photo_outside && !!form.photo_inside

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register your cars to apply for matching jobs</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(empty); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Add vehicle form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">New Vehicle</h2>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          {/* Vehicle Photos — Outside + Inside (both required) */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vehicle Photos <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Both an outside <em>and</em> inside photo are required before saving.
            </p>

            {/* Hidden inputs */}
            <input ref={outsideInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleSlotUpload(e, 'outside')} disabled={!!uploadingSlot} />
            <input ref={insideInputRef}  type="file" accept="image/*" className="hidden"
              onChange={e => handleSlotUpload(e, 'inside')}  disabled={!!uploadingSlot} />

            <div className="grid grid-cols-2 gap-4">
              {/* Outside slot */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  Outside <span className="text-red-500">*</span>
                </p>
                {form.photo_outside ? (
                  <div className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
                    <img src={form.photo_outside} alt="Outside" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, photo_outside: '' }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-gray-800/70 text-white px-1.5 py-0.5 rounded">
                      OUTSIDE
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => outsideInputRef.current?.click()}
                    disabled={!!uploadingSlot}
                    className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 disabled:opacity-50"
                  >
                    {uploadingSlot === 'outside' ? (
                      <span className="text-[10px]">Uploading…</span>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Upload Outside Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Inside slot */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  Inside <span className="text-red-500">*</span>
                </p>
                {form.photo_inside ? (
                  <div className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
                    <img src={form.photo_inside} alt="Inside" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, photo_inside: '' }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-gray-800/70 text-white px-1.5 py-0.5 rounded">
                      INSIDE
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => insideInputRef.current?.click()}
                    disabled={!!uploadingSlot}
                    className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500 disabled:opacity-50"
                  >
                    {uploadingSlot === 'inside' ? (
                      <span className="text-[10px]">Uploading…</span>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Upload Inside Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {uploadError && <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: 'make', label: 'Make', placeholder: 'e.g. Mercedes' },
              { key: 'model', label: 'Model', placeholder: 'e.g. E-Class' },
              { key: 'registration', label: 'Registration', placeholder: 'e.g. AB12 CDE' },
              { key: 'year', label: 'Year', placeholder: 'e.g. 2022', type: 'number' },
              { key: 'color', label: 'Colour', placeholder: 'e.g. Black' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <input
                  type={field.type ?? 'text'}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
              <select
                value={form.car_type}
                onChange={e => setForm(f => ({ ...f, car_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CAR_TYPES.map(t => <option key={t} value={t}>{carTypeLabel(t)}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !!uploadingSlot || !canSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Vehicle'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(empty); setError('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vehicle list */}
      {vehicles.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No vehicles registered</p>
          <p className="text-gray-400 text-xs mt-1">Add your car to start applying for jobs</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {vehicles.map(v => (
            <div key={v.id} className={`bg-white rounded-xl border ${v.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'} overflow-hidden`}>
              {/* Photo strip */}
              {(v.photo_outside || v.photo_inside || v.photo_url) && (
                <div className="grid grid-cols-2 gap-1 p-2 pb-0">
                  {(v.photo_outside || v.photo_url) && (
                    <div className="relative rounded-lg overflow-hidden aspect-[16/9]">
                      <img src={v.photo_outside ?? v.photo_url ?? ''} alt="Outside" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-gray-800/60 text-white px-1.5 py-0.5 rounded">OUTSIDE</span>
                    </div>
                  )}
                  {v.photo_inside && (
                    <div className="relative rounded-lg overflow-hidden aspect-[16/9]">
                      <img src={v.photo_inside} alt="Inside" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-gray-800/60 text-white px-1.5 py-0.5 rounded">INSIDE</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-4 p-4">
                {!v.photo_outside && !v.photo_url && (
                  <div className="w-28 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{v.make} {v.model}</h3>
                      <p className="text-sm text-gray-500">{v.registration}{v.year ? ` · ${v.year}` : ''}{v.color ? ` · ${v.color}` : ''}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {carTypeLabel(v.car_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => toggleActive(v.id, v.is_active)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {v.is_active ? 'Set Inactive' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
