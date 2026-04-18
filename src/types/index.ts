// ============================================================
// Chauffex - Core TypeScript Types
// Built to support 150+ companies and 1,000+ drivers
// ============================================================

// ---- User & Auth ----

export type UserRole = 'company_admin' | 'company_driver' | 'freelance_driver' | 'super_admin'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name: string
  avatar_url?: string
  company_id?: string // null for freelance drivers
  created_at: string
  updated_at: string
}

// ---- Company ----

export interface Company {
  id: string
  name: string
  logo_url?: string
  subscription_plan: 'starter' | 'pro' | 'enterprise'
  is_active: boolean
  is_suspended: boolean
  created_at: string
}

// ---- Vehicle / Fleet ----

export type VehicleStatus = 'available' | 'on_job' | 'off_road'
export type CarType = 'saloon' | 'estate' | 'suv' | 'mpv' | 'minibus' | 'executive' | 'van'

export interface Vehicle {
  id: string
  company_id: string
  make: string
  model: string
  year: number
  registration: string
  car_type: CarType
  status: VehicleStatus
  colour?: string
  photo_url?: string | null
  // Compliance dates
  mot_date?: string
  service_date?: string
  road_tax_date?: string
  insurance_date?: string
  // Metadata
  created_at: string
  updated_at: string
}

// ---- Driver ----

export type DriverCategory = 'company' | 'freelance'
export type AvailabilityStatus = 'available' | 'on_job' | 'offline'

export interface Driver {
  id: string // references user profile id
  company_id?: string
  full_name: string
  photo_url?: string
  car_type: CarType // preferred or licensed car type
  licence_number?: string
  licence_expiry?: string
  availability_status: AvailabilityStatus
  driver_category: DriverCategory
  is_verified: boolean
  rating: number // 0–5
  rating_count: number
  // Live location (updated by driver app)
  current_lat?: number
  current_lng?: number
  created_at: string
  updated_at: string
}

// ---- Job ----

export type JobStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export interface Job {
  id: string
  company_id: string
  // Locations
  pickup_address: string
  pickup_lat?: number
  pickup_lng?: number
  dropoff_address: string
  dropoff_lat?: number
  dropoff_lng?: number
  // Schedule
  job_date: string // ISO date
  job_time: string // HH:MM
  // Details
  price: number
  preferred_car_type?: CarType
  notes?: string
  // Status
  status: JobStatus
  driver_id?: string // null until assigned
  // Metadata
  created_by: string // user id of admin who created
  created_at: string
  updated_at: string
}

// ---- Alerts ----

export interface ComplianceAlert {
  vehicleId: string
  registration: string
  make: string
  model: string
  alertType: 'mot' | 'service' | 'road_tax' | 'insurance'
  dueDate: string
  daysUntilDue: number
}

// ---- Super Admin Stats ----

export interface SuperAdminStats {
  totalCompanies: number
  activeCompanies: number
  suspendedCompanies: number
  totalDrivers: number
  totalJobs: number
  jobsToday: number
  newCompaniesThisWeek: number
}

// ---- Dashboard Stats ----

export interface AdminDashboardStats {
  totalVehicles: number
  availableVehicles: number
  vehiclesOnJob: number
  vehiclesOffRoad: number
  totalDrivers: number
  availableDrivers: number
  driversOnJob: number
  pendingJobs: number
  activeJobs: number
  completedJobsToday: number
  complianceAlerts: number
}
