'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet, PoundSterling, CheckCircle2, Clock, TrendingUp,
  AlertCircle, CreditCard, User, Calendar, Search,
  ArrowDownCircle, ArrowUpCircle, Plus, X, RefreshCw,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentJob {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  price: number
  payment_status: string | null
  driver_id: string | null
  driver_name: string | null
  price_type: string | null
  job_type: string | null
}

interface WalletTx {
  id: string
  amount: number
  type: 'topup' | 'payment'
  description: string | null
  job_id: string | null
  created_at: string
}

interface Props {
  walletBalance: number
  walletTransactions: WalletTx[]
  jobs: PaymentJob[]
}

export function AdminWalletClient({ walletBalance: initialBalance, walletTransactions, jobs }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'payments' | 'history'>('payments')

  // Wallet top-up state
  const [showTopup, setShowTopup] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)

  // Optimistic balance
  const [balance, setBalance] = useState(initialBalance)

  // Per-job paying state
  const [payingJobs, setPayingJobs] = useState<Set<string>>(new Set())
  const [paidJobs, setPaidJobs] = useState<Set<string>>(new Set())
  const [payError, setPayError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const paid   = jobs.filter(j => j.payment_status === 'paid' || paidJobs.has(j.id))
  const unpaid = jobs.filter(j => j.payment_status !== 'paid' && !paidJobs.has(j.id) && j.driver_id)

  const totalPaid    = paid.reduce((s, j) => s + (j.price ?? 0), 0)
  const totalPending = unpaid.reduce((s, j) => s + (j.price ?? 0), 0)
  const totalAll     = jobs.reduce((s, j) => s + (j.price ?? 0), 0)

  const filtered = jobs.filter(j => {
    const isPaidJob = j.payment_status === 'paid' || paidJobs.has(j.id)
    const matchFilter =
      filter === 'all'    ? true :
      filter === 'paid'   ? isPaidJob :
      !isPaidJob && !!j.driver_id
    const matchSearch = search === '' ||
      j.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      j.dropoff_address.toLowerCase().includes(search.toLowerCase()) ||
      (j.driver_name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  // Monthly spend — last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    const ms = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const amount = paid.filter(j => j.job_date >= ms && j.job_date <= me).reduce((s, j) => s + (j.price ?? 0), 0)
    return { label, amount }
  })
  const maxBar = Math.max(...monthlyData.map(m => m.amount), 1)

  async function handleTopup() {
    const amt = parseFloat(topupAmount)
    if (!amt || amt < 1) return
    setTopupLoading(true)
    try {
      const res = await fetch('/api/stripe/wallet/company-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      let json: { url?: string; error?: string } = {}
      try {
        json = await res.json()
      } catch {
        const text = await res.text().catch(() => 'Unknown server error')
        alert(`Server error (${res.status}): ${text.replace(/<[^>]+>/g, '').trim().slice(0, 300)}`)
        setTopupLoading(false)
        return
      }
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        alert(json.error ?? 'Failed to start top-up')
        setTopupLoading(false)
      }
    } catch (err: any) {
      alert(`Request failed: ${err?.message ?? 'Unknown error'}`)
      setTopupLoading(false)
    }
  }

  async function payDriver(job: PaymentJob) {
    if (payingJobs.has(job.id)) return
    setPayError(null)
    setPayingJobs(prev => new Set([...prev, job.id]))

    try {
      const res = await fetch('/api/stripe/jobs/pay-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setPaidJobs(prev => new Set([...prev, job.id]))
        setBalance(prev => prev - (job.price ?? 0))
        startTransition(() => router.refresh())
      } else {
        setPayError(json.error ?? 'Payment failed')
        // Scroll to error
        setTimeout(() => {
          document.getElementById('pay-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    } catch {
      setPayError('Network error — please try again')
    } finally {
      setPayingJobs(prev => { const s = new Set(prev); s.delete(job.id); return s })
    }
  }

  const priceLabel = (job: PaymentJob) => {
    if (job.job_type !== 'daily') return ''
    if (job.price_type === 'per_hour') return '/hr'
    if (job.price_type === 'per_day') return '/day'
    return ''
  }

  const QUICK_AMOUNTS = [50, 100, 200, 500]

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your wallet and pay drivers</p>
      </div>

      {/* ── Wallet Balance Card ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 mb-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Company Wallet</p>
            <p className="text-4xl font-bold mt-1">{formatCurrency(balance)}</p>
            <p className="text-blue-200 text-xs mt-1">Available to pay drivers</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setShowTopup(v => !v)}
              className="flex items-center gap-1.5 bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              Add Funds
            </button>
            {unpaid.length > 0 && (
              <p className="text-xs text-blue-200">{unpaid.length} driver{unpaid.length !== 1 ? 's' : ''} awaiting payment</p>
            )}
          </div>
        </div>

        {/* Insufficient balance warning */}
        {balance < totalPending && totalPending > 0 && (
          <div className="mt-4 bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-300 flex-shrink-0" />
            <p className="text-xs text-blue-100">
              You need <span className="font-semibold text-white">{formatCurrency(totalPending - balance)}</span> more to pay all outstanding drivers
            </p>
          </div>
        )}
      </div>

      {/* ── Top-up panel ────────────────────────────────────────────────── */}
      {showTopup && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Add Funds to Wallet</h2>
            <button onClick={() => setShowTopup(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {QUICK_AMOUNTS.map(q => (
              <button
                key={q}
                onClick={() => setTopupAmount(String(q))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  topupAmount === String(q)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'
                }`}
              >
                £{q}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">£</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Custom amount"
                value={topupAmount}
                onChange={e => setTopupAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleTopup}
              disabled={topupLoading || !topupAmount || parseFloat(topupAmount) < 1}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {topupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Pay via Card
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Funds are added instantly after payment. Powered by Stripe.</p>
        </div>
      )}

      {/* ── Pay error ───────────────────────────────────────────────────── */}
      {payError && (
        <div id="pay-error" className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Payment failed</p>
            <p className="text-xs text-red-600 mt-0.5">{payError}</p>
          </div>
          <button onClick={() => setPayError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total Paid Out</span>
            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">{paid.length} payment{paid.length !== 1 ? 's' : ''} completed</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Outstanding</span>
            <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-orange-500 mt-1 font-medium">{unpaid.length} job{unpaid.length !== 1 ? 's' : ''} awaiting payment</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Total Job Value</span>
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <PoundSterling className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAll)}</p>
          <p className="text-xs text-gray-400 mt-1">{jobs.length} completed job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 w-fit">
        {([
          { key: 'payments', label: 'Driver Payments' },
          { key: 'history',  label: `Wallet History (${walletTransactions.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Wallet History tab ──────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          {walletTransactions.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
              <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No wallet transactions yet</p>
              <p className="text-gray-300 text-xs mt-1">Top up your wallet to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {walletTransactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'topup' ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    {tx.type === 'topup'
                      ? <ArrowDownCircle className="w-4 h-4 text-green-600" />
                      : <ArrowUpCircle className="w-4 h-4 text-blue-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {tx.type === 'topup' ? 'Wallet Top-Up' : 'Driver Payment'}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{tx.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${tx.type === 'topup' ? 'text-green-600' : 'text-gray-800'}`}>
                      {tx.type === 'topup' ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Driver Payments tab ─────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <>
          {/* Monthly spend chart */}
          {totalPaid > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Monthly Driver Payments
              </h2>
              <div className="flex items-end gap-3 h-28">
                {monthlyData.map(({ label, amount }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    {amount > 0 && (
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{formatCurrency(amount)}</span>
                    )}
                    <div
                      className="w-full rounded-t-md bg-blue-500"
                      style={{ height: `${Math.max((amount / maxBar) * 80, amount > 0 ? 4 : 2)}px`, opacity: amount > 0 ? 1 : 0.15 }}
                    />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outstanding alert */}
          {unpaid.length > 0 && (
            <div className="mb-5 flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800">
                  {unpaid.length} job{unpaid.length !== 1 ? 's' : ''} pending driver payment
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {formatCurrency(totalPending)} outstanding — funds are deducted from your wallet instantly
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by address or driver..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {([
                { key: 'all',    label: `All (${jobs.length})` },
                { key: 'unpaid', label: `Unpaid (${unpaid.length})` },
                { key: 'paid',   label: `Paid (${paid.length})` },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment list */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
              <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No payments found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {filtered.map(job => {
                const isPaid = job.payment_status === 'paid' || paidJobs.has(job.id)
                const isPaying = payingJobs.has(job.id)
                const canAfford = balance >= (job.price ?? 0)

                return (
                  <div key={job.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPaid ? 'bg-green-500' : 'bg-orange-400'}`} />

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {job.pickup_address.split(',')[0]} → {job.dropoff_address.split(',')[0]}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(job.job_date)}
                        </span>
                        {job.driver_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {job.driver_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(job.price)}
                        {priceLabel(job) && (
                          <span className="text-xs font-normal text-gray-400">{priceLabel(job)}</span>
                        )}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0 w-28 text-right">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      ) : job.driver_id ? (
                        <button
                          onClick={() => payDriver(job)}
                          disabled={isPaying || !canAfford}
                          title={!canAfford ? `Need ${formatCurrency(job.price)} — add funds first` : undefined}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            !canAfford
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isPaying
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <CreditCard className="w-3 h-3" />
                          }
                          {isPaying ? 'Paying…' : canAfford ? 'Pay Driver' : 'Top Up'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">No driver</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
