'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Car,
  Users,
  Briefcase,
  Radio,
  Map,
  LogOut,
  ChevronRight,
  X,
  TrendingUp,
  CalendarDays,
  BarChart2,
  TableProperties,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard/admin',              label: 'Overview',       icon: LayoutDashboard },
  { href: '/dashboard/admin/fleet',        label: 'Fleet',          icon: Car },
  { href: '/dashboard/admin/drivers',      label: 'Drivers',        icon: Users },
  { href: '/dashboard/admin/jobs',         label: 'Jobs',           icon: Briefcase },
  { href: '/dashboard/admin/dispatch',     label: 'Dispatch',       icon: Radio },
  { href: '/dashboard/admin/map',          label: 'Map View',       icon: Map },
  { href: '/dashboard/admin/performance',  label: 'Performance',    icon: TrendingUp },
  { href: '/dashboard/admin/calendar',     label: 'Calendar',       icon: CalendarDays },
  { href: '/dashboard/admin/analytics',    label: 'Analytics',      icon: BarChart2 },
  { href: '/dashboard/admin/spreadsheet',  label: 'Spreadsheet',    icon: TableProperties },
  { href: '/dashboard/admin/outsourced',   label: 'Outsourced Jobs', icon: ExternalLink },
]

interface AdminSidebarProps {
  onClose?: () => void
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-60 h-full min-h-screen bg-gray-950 flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm">[PLATFORM]</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/dashboard/admin'
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
