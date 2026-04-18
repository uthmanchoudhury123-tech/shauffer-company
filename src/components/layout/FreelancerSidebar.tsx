'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Search, Briefcase, Wallet, CalendarDays, Bell,
  History, FileText, MessageSquare, Car, HelpCircle,
  LogOut, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard/freelancer/available-jobs', label: 'Available Jobs', icon: Search },
  { href: '/dashboard/freelancer/my-jobs', label: 'My Jobs', icon: Briefcase },
  { href: '/dashboard/freelancer/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/freelancer/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/dashboard/freelancer/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/freelancer/history', label: 'Job History', icon: History },
  { href: '/dashboard/freelancer/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/freelancer/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard/freelancer/vehicles', label: 'My Vehicles', icon: Car },
  { href: '/dashboard/freelancer/support', label: 'Support', icon: HelpCircle },
]

interface FreelancerSidebarProps {
  driverName: string
  photoUrl?: string | null
  email?: string
  balance?: number
  onClose?: () => void
}

export function FreelancerSidebar({ driverName, photoUrl, email, balance = 0, onClose }: FreelancerSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-60 h-full bg-gray-950 flex flex-col border-r border-gray-800">
      {/* Driver profile header */}
      <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between gap-2">
        <Link href="/dashboard/freelancer/profile" className="flex items-center gap-3 min-w-0 group flex-1">
          <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors bg-blue-600 flex items-center justify-center">
            {photoUrl
              ? <img src={photoUrl} alt={driverName} className="w-full h-full object-cover" />
              : <span className="text-sm font-bold text-white">{driverName.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{driverName}</p>
            <p className="text-xs text-blue-400">Freelancer</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Wallet balance */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-400">Wallet balance</span>
          <span className="text-sm font-bold text-green-400">£{balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
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
