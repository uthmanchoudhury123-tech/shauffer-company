'use client'

import { useState } from 'react'
import { Bell, BellOff, CheckCheck, Briefcase, Wallet, Star, Info } from 'lucide-react'

interface Notification {
  id: string
  title: string
  body: string | null
  type: string
  read: boolean
  link: string | null
  created_at: string
}

interface Props {
  notifications: Notification[]
  userId: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const typeIcon: Record<string, React.ReactNode> = {
  job_application:  <Briefcase className="w-4 h-4 text-blue-400" />,
  job_accepted:     <CheckCheck className="w-4 h-4 text-green-400" />,
  payment_received: <Wallet className="w-4 h-4 text-green-400" />,
  job_completed:    <Star className="w-4 h-4 text-yellow-400" />,
  general:          <Info className="w-4 h-4 text-gray-400" />,
}

export function NotificationsClient({ notifications: initial, userId }: Props) {
  const [notifications, setNotifications] = useState(initial)
  const [marking, setMarking] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  async function markAllRead() {
    if (unreadCount === 0) return
    setMarking(true)
    await fetch('/api/freelancer/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setMarking(false)
  }

  async function markOne(id: string) {
    await fetch('/api/freelancer/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-400 text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-800">
            <BellOff className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-300 font-medium">No notifications yet</p>
          <p className="text-gray-500 text-sm mt-1">We'll let you know when something happens</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => !n.read && markOne(n.id)}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                n.read
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-blue-950/30 border-blue-800/40 hover:bg-blue-950/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  n.read ? 'bg-gray-800' : 'bg-gray-800'
                }`}>
                  {typeIcon[n.type] ?? typeIcon.general}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${n.read ? 'text-gray-300' : 'text-white'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  )}
                </div>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
