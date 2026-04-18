'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2, CreditCard, Zap, Users, Briefcase, BarChart2,
  Car, FileText, Map, Shield, AlertTriangle, Clock, Sparkles
} from 'lucide-react'

interface Company {
  name: string
  subscription_status: string
  trial_ends_at: string | null
  subscription_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

const FEATURES = [
  { icon: Users,     label: 'Unlimited drivers' },
  { icon: Briefcase, label: 'Unlimited job dispatch' },
  { icon: Car,       label: 'Fleet management' },
  { icon: Map,       label: 'Live map tracking' },
  { icon: BarChart2, label: 'Analytics & reporting' },
  { icon: FileText,  label: 'Meet & greet sign generator' },
  { icon: Zap,       label: 'Push notifications' },
  { icon: Shield,    label: 'Driver verification tools' },
]

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function BillingClient({ company }: { company: Company | null }) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<'subscribe' | 'portal' | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast({ msg: 'Subscription activated! Welcome to Chauffex.', ok: true })
    } else if (searchParams.get('canceled') === '1') {
      setToast({ msg: 'Checkout canceled. No charge was made.', ok: false })
    }
  }, [searchParams])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleSubscribe() {
    setLoading('subscribe')
    const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
    const { url, error } = await res.json()
    if (url) window.location.href = url
    else { setToast({ msg: error ?? 'Something went wrong', ok: false }); setLoading(null) }
  }

  async function handlePortal() {
    setLoading('portal')
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url, error } = await res.json()
    if (url) window.location.href = url
    else { setToast({ msg: error ?? 'Something went wrong', ok: false }); setLoading(null) }
  }

  const status = company?.subscription_status ?? 'trialing'
  const trialDays = daysUntil(company?.trial_ends_at ?? null)
  const hasActiveSubscription = company?.stripe_subscription_id && (status === 'active' || status === 'trialing')
  const isExpired = status === 'expired' || status === 'canceled' || (status === 'trialing' && trialDays === 0)
  const isPastDue = status === 'past_due'

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your Chauffex platform subscription</p>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl p-6 mb-6 ${
        status === 'active' ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
        status === 'trialing' && (trialDays ?? 0) > 0 ? 'bg-gradient-to-br from-gray-900 to-gray-800' :
        isPastDue ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
        'bg-gradient-to-br from-red-700 to-red-800'
      } text-white`}>
        <div className="flex items-start justify-between">
          <div>
            {status === 'active' && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span className="text-blue-100 text-sm font-medium">Active subscription</span>
                </div>
                <p className="text-3xl font-bold">Chauffex Platform</p>
                <p className="text-blue-100 mt-1 text-sm">£299 / month · All features included</p>
              </>
            )}
            {status === 'trialing' && (trialDays ?? 0) > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-300" />
                  <span className="text-gray-300 text-sm font-medium">Free trial</span>
                </div>
                <p className="text-3xl font-bold">{trialDays} days left</p>
                <p className="text-gray-300 mt-1 text-sm">Subscribe before your trial ends to keep full access</p>
              </>
            )}
            {isPastDue && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-200" />
                  <span className="text-amber-100 text-sm font-medium">Payment past due</span>
                </div>
                <p className="text-3xl font-bold">Action required</p>
                <p className="text-amber-100 mt-1 text-sm">Please update your payment method to avoid losing access</p>
              </>
            )}
            {isExpired && !isPastDue && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-200" />
                  <span className="text-red-100 text-sm font-medium">Subscription inactive</span>
                </div>
                <p className="text-3xl font-bold">Access paused</p>
                <p className="text-red-100 mt-1 text-sm">Subscribe to re-activate your account</p>
              </>
            )}
          </div>
          <CreditCard className="w-10 h-10 opacity-30" />
        </div>

        {/* CTA */}
        <div className="mt-5 flex gap-3">
          {!hasActiveSubscription && (
            <button
              onClick={handleSubscribe}
              disabled={loading === 'subscribe'}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <Zap className="w-4 h-4 text-blue-600" />
              {loading === 'subscribe' ? 'Redirecting…' : 'Activate subscription'}
            </button>
          )}
          {hasActiveSubscription && (
            <button
              onClick={handlePortal}
              disabled={loading === 'portal'}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" />
              {loading === 'portal' ? 'Redirecting…' : 'Manage billing'}
            </button>
          )}
          {isPastDue && (
            <button
              onClick={handlePortal}
              disabled={loading === 'portal'}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-700 rounded-xl font-semibold text-sm hover:bg-amber-50 transition-colors disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" />
              {loading === 'portal' ? 'Redirecting…' : 'Update payment method'}
            </button>
          )}
        </div>
      </div>

      {/* Pricing card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Chauffex Platform</h2>
          <div className="text-right">
            <span className="text-3xl font-bold text-gray-900">£299</span>
            <span className="text-gray-400 text-sm">/month</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-5">Everything you need to run your chauffeur company</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm text-gray-700">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              {label}
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>Includes a <strong className="text-gray-700">90-day free trial</strong> — no card required until day 90</span>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4 text-sm text-gray-600">
        <div>
          <p className="font-semibold text-gray-800 mb-0.5">When will I be charged?</p>
          <p>Your free trial lasts 90 days. You won't be charged until the trial ends. You can cancel any time before then.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-0.5">Can I cancel any time?</p>
          <p>Yes — cancel from the billing portal at any time. You keep access until the end of the billing period.</p>
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-0.5">What payment methods are accepted?</p>
          <p>All major credit and debit cards via Stripe. Your payment is fully secured.</p>
        </div>
      </div>
    </div>
  )
}
