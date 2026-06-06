// ============================================================
// Utility Functions
// ============================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO, format } from 'date-fns'
import type { ComplianceAlert, Vehicle } from '@/types'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date string to a readable format */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Not set'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return 'Invalid date'
  }
}

/** Returns days until a date (negative = past due) */
export function daysUntil(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null
  try {
    return differenceInDays(parseISO(dateStr), new Date())
  } catch {
    return null
  }
}

/**
 * Scan a vehicle's compliance dates and return any alerts
 * where a date is within 30 days or already expired.
 */
export function getComplianceAlerts(vehicle: Vehicle): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = []
  const ALERT_THRESHOLD_DAYS = 30

  const checks: Array<{ field: ComplianceAlert['alertType']; date?: string }> = [
    { field: 'mot', date: vehicle.mot_date },
    { field: 'service', date: vehicle.service_date },
    { field: 'road_tax', date: vehicle.road_tax_date },
    { field: 'insurance', date: vehicle.insurance_date },
  ]

  for (const check of checks) {
    const days = daysUntil(check.date)
    if (days !== null && days <= ALERT_THRESHOLD_DAYS) {
      alerts.push({
        vehicleId: vehicle.id,
        registration: vehicle.registration,
        make: vehicle.make,
        model: vehicle.model,
        alertType: check.field,
        dueDate: check.date!,
        daysUntilDue: days,
      })
    }
  }

  return alerts
}

/** Status badge colour mapping for vehicles */
export function vehicleStatusColor(status: string): string {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800'
    case 'on_job':    return 'bg-blue-100 text-blue-800'
    case 'off_road':  return 'bg-red-100 text-red-800'
    default:          return 'bg-gray-100 text-gray-800'
  }
}

/** Status badge colour mapping for drivers */
export function driverStatusColor(status: string): string {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800'
    case 'on_job':    return 'bg-blue-100 text-blue-800'
    case 'offline':   return 'bg-gray-100 text-gray-800'
    default:          return 'bg-gray-100 text-gray-800'
  }
}

/** Job status badge colour */
export function jobStatusColor(status: string): string {
  switch (status) {
    case 'pending':     return 'bg-yellow-100 text-yellow-800'
    case 'assigned':    return 'bg-blue-100 text-blue-800'
    case 'in_progress': return 'bg-purple-100 text-purple-800'
    case 'completed':   return 'bg-green-100 text-green-800'
    case 'cancelled':   return 'bg-red-100 text-red-800'
    default:            return 'bg-gray-100 text-gray-800'
  }
}

/** Compliance alert colour based on days remaining */
export function alertSeverityColor(days: number): string {
  if (days < 0)  return 'bg-red-100 text-red-800 border-red-200'
  if (days <= 7) return 'bg-red-100 text-red-800 border-red-200'
  if (days <= 14) return 'bg-orange-100 text-orange-800 border-orange-200'
  return 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

/** Format currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

/** Human-readable label for car type */
export function carTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    saloon: 'Saloon',
    estate: 'Estate',
    suv: 'SUV',
    mpv: 'MPV',
    minibus: 'Minibus',
    executive: 'Executive',
    van: 'Van',
    hybrid: 'Hybrid / Eco',
    electric: 'Electric / EV',
  }
  return labels[type] ?? type
}

/** Human-readable label for alert type */
export function alertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mot: 'MOT',
    service: 'Service',
    road_tax: 'Road Tax',
    insurance: 'Insurance',
  }
  return labels[type] ?? type
}
