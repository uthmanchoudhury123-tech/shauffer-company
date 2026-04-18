'use client'

import { useState } from 'react'
import { AlertTriangle, Zap, X, Clock } from 'lucide-react'

interface Props {
  status: string
  trialEndsAt: string | null
  hasSubscription: boolean
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function SubscriptionGate({ status, trialEndsAt, hasSubscription }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const trialDays = daysUntil(trialEndsAt)

  // Active subscription — no banner
  if (hasSubscription && status === 'active') return null
  // Healthy trial — only show banner if ≤ 14 days left
  if (status === 'trialing' && (trialDays ?? 999) > 14) return null
  // Dismissed
  if (dismissed && status !== 'expired' && status !== 'canceled') return null

  const isUrgent = status === 'expired' || status === 'canceled' || status === 'past_due' || (status === 'trialing' && trialDays === 0)

  async function handleSubscribe() {
    const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  return (
    <div className={`mx-4 mt-4 rounded-xl px-4 py-3 flex items-center gap-3
      ${isUrgent
        ? 'bg-red-50 border border-red-200'
        : 'bg-amber-50 border border-amber-200'
      }`}>
      {isUrgent
        ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        : <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
      }
      <p className={`flex-1 text-sm ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
        {status === 'past_due'
          ? 'Your payment failed. Please update your payment method to keep access.'
          : status === 'expired' || status === 'canceled'
          ? 'Your subscription has ended. Subscribe to re-activate your account.'
          : `Your free trial ends in ${trialDays} day${trialDays === 1 ? '' : 's'}. Subscribe to keep full access.`
        }
      </p>
      <button
        onClick={handleSubscribe}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap
          ${isUrgent
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-amber-500 text-white hover:bg-amber-600'
          } transition-colors`}
      >
        <Zap className="w-3 h-3" />
        Subscribe — £299/mo
      </button>
      {!isUrgent && (
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
