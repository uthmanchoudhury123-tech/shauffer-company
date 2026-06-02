'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  CreditCard,
  Settings,
  Building2,
  MessageSquare,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard/admin',              label: 'Overview',        icon: LayoutDashboard },
  { href: '/dashboard/admin/fleet',        label: 'Fleet',           icon: Car },
  { href: '/dashboard/admin/drivers',      label: 'Drivers',         icon: Users },
  { href: '/dashboard/admin/jobs',         label: 'Jobs',            icon: Briefcase },
  { href: '/dashboard/admin/wallet',       label: 'Payments',        icon: Wallet },
  { href: '/dashboard/admin/messages',     label: 'Messages',        icon: MessageSquare },
  { href: '/dashboard/admin/dispatch',     label: 'Dispatch',        icon: Radio },
  { href: '/dashboard/admin/map',          label: 'Map View',        icon: Map },
  { href: '/dashboard/admin/performance',  label: 'Performance',     icon: TrendingUp },
  { href: '/dashboard/admin/calendar',     label: 'Calendar',        icon: CalendarDays },
  { href: '/dashboard/admin/analytics',    label: 'Analytics',       icon: BarChart2 },
  { href: '/dashboard/admin/spreadsheet',  label: 'Spreadsheet',     icon: TableProperties },
  { href: '/dashboard/admin/outsourced',   label: 'Outsourced Jobs', icon: ExternalLink },
  { href: '/dashboard/admin/billing',      label: 'Billing',         icon: CreditCard },
  { href: '/dashboard/admin/settings',     label: 'Settings',        icon: Settings },
]

interface AdminSidebarProps {
  onClose?: () => void
  companyName?: string
  companyLogo?: string | null
  adminName?: string
}

export function AdminSidebar({ onClose, companyName, companyLogo, adminName }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false)
      setUnread(count ?? 0)
    }
    fetchUnread()
    const channel = supabase
      .channel('admin-sidebar-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-60 h-full min-h-screen bg-gray-950 flex flex-col border-r border-gray-800">
      {/* Company profile header */}
      <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between gap-2">
        <Link href="/dashboard/admin/settings" className="flex items-center gap-3 min-w-0 group flex-1">
          {/* Logo / avatar */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10
                          group-hover:border-white/20 transition-colors bg-gray-800">
            {companyLogo
              ? <img src={companyLogo} alt={companyName} className="w-full h-full object-contain p-0.5" />
              : <Building2 className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {companyName ?? 'Chauffex'}
            </p>
            {adminName && (
              <p className="text-xs text-gray-500 truncate">{adminName}</p>
            )}
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white p-1 flex-shrink-0"
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
              {item.href === '/dashboard/admin/messages' && unread > 0 ? (
                <span className="ml-auto flex-shrink-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : isActive ? (
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              ) : null}
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
