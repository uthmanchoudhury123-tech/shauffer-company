'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Plus, Trash2, Star, X } from 'lucide-react'

interface Vehicle {
  id: string
  make: string
  model: string
  year: number | null
  color: string | null
  reg_plate: string
  vehicle_type: string
  is_primary: boolean
}

interface Props {
  vehicles: Vehicle[]
  driverId: string
}

const VEHICLE_TYPES = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']

const typeLabel: Record<string, string> = {
  saloon: 'Saloon', estate: 'Estate', suv: 'SUV', mpv: 'MPV',
  minibus: 'Minibus', executive: 'Executive', van: 'Van',
}

const typeColor: Record<string, string> = {
  saloon: 'bg-blue-500/20 text-blue-400',
  estate: 'bg-purple-500/20 text-purple-400',
  suv: 'bg-green-500/20 text-green-400',
  mpv: 'bg-yellow-500/20 text-yellow-400',
  minibus: 'bg-orange-500/20 text-orange-400',
  executive: 'bg-pink-500/20 text-pink-400',
  van: 'bg-cyan-500/20 text-cyan-400',
}

export function VehiclesClient({ vehicles: initial, driverId }: Props) {
  const router = useRouter()
  const [vehicles, setVehicles] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    make: '', model: '', year: '', color: '', reg_plate: '', vehicle_type: 'saloon',
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/freelancer/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: form.year ? parseInt(form.year) : null }),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ make: '', model: '', year: '', color: '', reg_plate: '', vehicle_type: 'saloon' })
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/freelancer/vehicles?id=${id}`, { method: 'DELETE' })
    setVehicles(prev => prev.filter(v => v.id !== id))
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Vehicles</h1>
          <p className="text-gray-400 text-sm mt-1">{vehicles.length} registered</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Vehicle grid */}
      {vehicles.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-800">
            <Car className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-300 font-medium">No vehicles added</p>
          <p className="text-gray-500 text-sm mt-1">Add your vehicles to show on job applications</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
          {vehicles.map(v => (
            <div key={v.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative group">
              {v.is_primary && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-yellow-400 text-xs">
                  <Star className="w-3 h-3 fill-yellow-400" /> Primary
                </div>
              )}
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-white font-semibold text-lg">{v.make} {v.model}</p>
              <p className="text-gray-400 text-sm font-mono mt-0.5 tracking-wider">{v.reg_plate.toUpperCase()}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[v.vehicle_type] ?? 'bg-gray-700 text-gray-300'}`}>
                  {typeLabel[v.vehicle_type] ?? v.vehicle_type}
                </span>
                {v.year && <span className="text-xs text-gray-500">{v.year}</span>}
                {v.color && <span className="text-xs text-gray-500">{v.color}</span>}
              </div>
              <button
                onClick={() => handleDelete(v.id)}
                disabled={deleting === v.id}
                className="mt-4 w-full flex items-center justify-center gap-2 py-1.5 text-xs text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-800/50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting === v.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Add Vehicle</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Make *</label>
                  <input required value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))}
                    placeholder="Toyota" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Model *</label>
                  <input required value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                    placeholder="Prius" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Registration Plate *</label>
                <input required value={form.reg_plate} onChange={e => setForm(p => ({ ...p, reg_plate: e.target.value.toUpperCase() }))}
                  placeholder="AB12 CDE" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Year</label>
                  <input type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year}
                    onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                    placeholder="2022" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color</label>
                  <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                    placeholder="Black" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Vehicle Type *</label>
                <select required value={form.vehicle_type} onChange={e => setForm(p => ({ ...p, vehicle_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-gray-600 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
