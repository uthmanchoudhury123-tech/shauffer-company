'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Car, AlertTriangle, Edit2, Trash2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import {
  formatDate, vehicleStatusColor, alertTypeLabel,
  alertSeverityColor, carTypeLabel, getComplianceAlerts
} from '@/lib/utils'
import type { Vehicle, CarType, VehicleStatus } from '@/types'

const CAR_TYPES: CarType[] = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']
const STATUSES: VehicleStatus[] = ['available', 'on_job', 'off_road']

interface FleetClientProps {
  vehicles: Vehicle[]
  companyId: string
}

const emptyForm = {
  make: '',
  model: '',
  year: new Date().getFullYear(),
  registration: '',
  car_type: 'saloon' as CarType,
  status: 'available' as VehicleStatus,
  colour: '',
  mot_date: '',
  service_date: '',
  road_tax_date: '',
  insurance_date: '',
}

export function FleetClient({ vehicles: initial, companyId }: FleetClientProps) {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>(initial)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = vehicles.filter(v =>
    v.registration.toLowerCase().includes(search.toLowerCase()) ||
    v.make.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  )

  // All compliance alerts across all vehicles
  const allAlerts = vehicles.flatMap(v => getComplianceAlerts(v))

  function openAdd() {
    setEditingVehicle(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(v: Vehicle) {
    setEditingVehicle(v)
    setForm({
      make: v.make,
      model: v.model,
      year: v.year,
      registration: v.registration,
      car_type: v.car_type,
      status: v.status,
      colour: v.colour ?? '',
      mot_date: v.mot_date ?? '',
      service_date: v.service_date ?? '',
      road_tax_date: v.road_tax_date ?? '',
      insurance_date: v.insurance_date ?? '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      ...form,
      company_id: companyId,
      year: Number(form.year),
      // Convert empty strings to null for date fields
      mot_date: form.mot_date || null,
      service_date: form.service_date || null,
      road_tax_date: form.road_tax_date || null,
      insurance_date: form.insurance_date || null,
      colour: form.colour || null,
    }

    if (editingVehicle) {
      const { data, error: err } = await supabase
        .from('vehicles')
        .update(payload)
        .eq('id', editingVehicle.id)
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? data : v))
    } else {
      const { data, error: err } = await supabase
        .from('vehicles')
        .insert(payload)
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      setVehicles(prev => [data, ...prev])
    }

    setSaving(false)
    setModalOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('vehicles').delete().eq('id', id)
    if (!err) setVehicles(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                     text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Compliance Alerts banner */}
      {allAlerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {allAlerts.length} compliance alert{allAlerts.length !== 1 ? 's' : ''} require attention
            </p>
            <div className="mt-2 space-y-1">
              {allAlerts.slice(0, 3).map((a, i) => (
                <p key={i} className="text-xs text-orange-700">
                  {a.registration} — {alertTypeLabel(a.alertType)} {
                    a.daysUntilDue < 0
                      ? `(${Math.abs(a.daysUntilDue)} days overdue)`
                      : `(in ${a.daysUntilDue} days)`
                  }
                </p>
              ))}
              {allAlerts.length > 3 && (
                <p className="text-xs text-orange-600">+{allAlerts.length - 3} more</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by registration, make or model..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Vehicle Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {search ? 'No vehicles match your search.' : 'No vehicles yet. Add your first vehicle.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vehicle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">MOT</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Insurance</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Alerts</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => {
                  const alerts = getComplianceAlerts(v)
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {v.year} {v.make} {v.model}
                        {v.colour && <span className="text-gray-400 font-normal ml-1">({v.colour})</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 uppercase">{v.registration}</td>
                      <td className="px-4 py-3 text-gray-600">{carTypeLabel(v.car_type)}</td>
                      <td className="px-4 py-3">
                        <Badge className={vehicleStatusColor(v.status)}>
                          {v.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className={`px-4 py-3 text-xs ${
                        v.mot_date && (new Date(v.mot_date).getTime() - Date.now()) / 86400000 <= 30
                          ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        {formatDate(v.mot_date)}
                      </td>
                      <td className={`px-4 py-3 text-xs ${
                        v.insurance_date && (new Date(v.insurance_date).getTime() - Date.now()) / 86400000 <= 30
                          ? 'text-red-600 font-medium' : 'text-gray-500'
                      }`}>
                        {formatDate(v.insurance_date)}
                      </td>
                      <td className="px-4 py-3">
                        {alerts.length > 0 ? (
                          <Badge className="bg-red-100 text-red-700">
                            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">OK</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Make *</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                placeholder="e.g. Toyota"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Model *</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="e.g. Prius"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
              <input
                type="number" min="1990" max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Registration *</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.registration} onChange={e => setForm(f => ({ ...f, registration: e.target.value.toUpperCase() }))}
                placeholder="AB12 CDE"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Colour</label>
              <input
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))}
                placeholder="e.g. Black"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Car Type *</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.car_type} onChange={e => setForm(f => ({ ...f, car_type: e.target.value as CarType }))}
              >
                {CAR_TYPES.map(t => <option key={t} value={t}>{carTypeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as VehicleStatus }))}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Compliance Dates */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Compliance Dates (alerts at 30 days)
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'mot_date', label: 'MOT Date' },
                { key: 'service_date', label: 'Service Date' },
                { key: 'road_tax_date', label: 'Road Tax Date' },
                { key: 'insurance_date', label: 'Insurance Date' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={(form as Record<string, unknown>)[field.key] as string}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.make || !form.model || !form.registration}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                         text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
