'use client'

import { useState } from 'react'
import { Users, Search, CheckCircle, Star, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { driverStatusColor, carTypeLabel, formatDate } from '@/lib/utils'
import type { Driver } from '@/types'

const CATEGORY_LABELS = {
  company: 'Company Driver',
  freelance: 'Freelance Driver',
}

interface DriversClientProps {
  drivers: Driver[]
  companyId: string
}

export function DriversClient({ drivers }: DriversClientProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'company' | 'freelance'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'on_job' | 'offline'>('all')

  const filtered = drivers.filter(d => {
    const matchSearch = d.full_name.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || d.driver_category === categoryFilter
    const matchStatus = statusFilter === 'all' || d.availability_status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  const companyCount = drivers.filter(d => d.driver_category === 'company').length
  const freelanceCount = drivers.filter(d => d.driver_category === 'freelance').length
  const availableCount = drivers.filter(d => d.availability_status === 'available').length

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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{companyCount}</p>
            <p className="text-xs text-gray-500">Company Drivers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{freelanceCount}</p>
            <p className="text-xs text-gray-500">Freelance Drivers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{availableCount}</p>
            <p className="text-xs text-gray-500">Available Now</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <p className="text-gray-400 text-sm">
            {search || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No drivers match your filters.'
              : 'No drivers yet. Drivers will appear here once they sign up and are assigned to your company.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <DriverCard key={driver.id} driver={driver} />
          ))}
        </div>
      )}
    </div>
  )
}

function DriverCard({ driver }: { driver: Driver }) {
  // Star rating display
  const stars = Math.round(driver.rating)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {driver.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driver.photo_url} alt={driver.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 font-semibold text-lg">
              {driver.full_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{driver.full_name}</h3>
            {driver.is_verified && (
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" aria-label="Verified Driver" />
            )}
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                className={`w-3 h-3 ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">
              {driver.rating > 0 ? `${driver.rating.toFixed(1)} (${driver.rating_count})` : 'No ratings'}
            </span>
          </div>
        </div>
      </div>

      {/* Status and details */}
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
        {driver.licence_expiry && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Licence Exp.</span>
            <span className="text-gray-700">{formatDate(driver.licence_expiry)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
