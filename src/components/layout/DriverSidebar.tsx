'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, LogOut, X, Car, Briefcase, FileText, User, PoundSterling, MessageSquare, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard/driver',                label: 'My Jobs',        icon: LayoutDashboard },
  { href: '/dashboard/driver/available-jobs', label: 'Available Jobs', icon: Briefcase },
  { href: '/dashboard/driver/earnings',       label: 'Earnings',       icon: PoundSterling },
  { href: '/dashboard/driver/wallet',         label: 'Wallet',         icon: Wallet },
  { href: '/dashboard/driver/my-vehicles',    label: 'My Vehicles',    icon: Car },
  { href: '/dashboard/driver/messages',       label: 'Messages',       icon: MessageSquare },
  { href: '/dashboard/driver/sign',           label: 'Meet & Greet',   icon: FileText },
  { href: '/dashboard/driver/profile',        label: 'My Profile',     icon: User },
]

interface DriverSidebarProps {
  driverName: string
  photoUrl?: string | null
  onClose?: () => void
}

export function DriverSidebar({ driverName, photoUrl, onClose }: DriverSidebarProps) {
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
      .channel('driver-sidebar-unread')
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
    <aside className="w-56 h-full min-h-screen bg-gray-950 flex flex-col border-r border-gray-800">
      {/* Driver profile header */}
      <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between gap-2">
        <Link href="/dashboard/driver/profile" className="flex items-center gap-3 min-w-0 group flex-1">
          <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors bg-blue-600 flex items-center justify-center">
            {photoUrl
              ? <img src={photoUrl} alt={driverName} className="w-full h-full object-cover" />
              : <span className="text-sm font-bold text-white">{driverName.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{driverName}</p>
            <p className="text-xs text-gray-500">Driver Portal</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/dashboard/driver' ? pathname === item.href : pathname.startsWith(item.href)
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
              {item.href === '/dashboard/driver/messages' && unread > 0 && (
                <span className="ml-auto flex-shrink-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
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
