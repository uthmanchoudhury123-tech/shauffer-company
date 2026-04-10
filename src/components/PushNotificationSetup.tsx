'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported' | 'loading'

export function PushNotificationSetup() {
  const [state, setState] = useState<PermissionState>('loading')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    setState(Notification.permission as PermissionState)
  }, [])

  async function enableNotifications() {
    setWorking(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        setWorking(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      if (res.ok) {
        setState('granted')
      }
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally {
      setWorking(false)
    }
  }

  async function disableNotifications() {
    setWorking(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('default')
    } catch (err) {
      console.error('Unsubscribe failed:', err)
    } finally {
      setWorking(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
        <BellOff className="w-3.5 h-3.5 flex-shrink-0" />
        Notifications blocked. Enable them in browser settings.
      </div>
    )
  }

  if (state === 'granted') {
    return (
      <button
        onClick={disableNotifications}
        disabled={working}
        className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        <Bell className="w-3.5 h-3.5" />
        {working ? 'Updating...' : 'Notifications on'}
      </button>
    )
  }

  return (
    <button
      onClick={enableNotifications}
      disabled={working}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white font-medium transition-colors disabled:opacity-50"
    >
      <Bell className="w-3.5 h-3.5" />
      {working ? 'Setting up...' : 'Enable Notifications'}
    </button>
  )
}
