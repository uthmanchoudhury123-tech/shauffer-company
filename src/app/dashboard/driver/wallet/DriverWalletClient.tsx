'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Wallet, ArrowUpCircle, CheckCircle2, AlertCircle,
  ExternalLink, Banknote, TrendingUp, TrendingDown,
  Lock, Car, PoundSterling,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  created_at: string
}

interface Props {
  balance: number
  transactions: Transaction[]
}

const TX_LABEL: Record<string, string> = {
  payment_received: 'Job Payment',
  withdrawal:       'Bank Withdrawal',
  topup:            'Wallet Top-Up',
  escrow_hold:      'Funds Held',
  escrow_release:   'Escrow Released',
  escrow_refund:    'Refund',
}

const TX_ICON: Record<string, React.ReactNode> = {
  payment_received: <Car className="w-4 h-4 text-green-400" />,
  withdrawal:       <ArrowUpCircle className="w-4 h-4 text-red-400" />,
  topup:            <TrendingUp className="w-4 h-4 text-green-400" />,
  escrow_hold:      <Lock className="w-4 h-4 text-yellow-400" />,
  escrow_release:   <Lock className="w-4 h-4 text-gray-400" />,
  escrow_refund:    <TrendingDown className="w-4 h-4 text-green-400" />,
}

export function DriverWalletClient({ balance, transactions }: Props) {
  const searchParams = useSearchParams()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetch('/api/stripe/connect/status')
      .then(r => r.json())
      .then(d => setOnboarded(d.onboarded ?? false))
      .catch(() => setOnboarded(false))
  }, [])

  useEffect(() => {
    const connect = searchParams.get('connect')
    const payment = searchParams.get('payment')
    if (connect === 'success') {
      setMessage({ text: 'Bank account connected! You can now withdraw your earnings.', type: 'success' })
      setOnboarded(true)
    } else if (connect === 'refresh') {
      setMessage({ text: 'Please complete the bank account setup.', type: 'error' })
    } else if (payment === 'success') {
      setMessage({ text: 'Payment received — your balance has been updated.', type: 'success' })
    }
  }, [searchParams])

  async function handleSetupPayouts() {
    setConnectLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: '/dashboard/driver/wallet' }),
      })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        setMessage({ text: json.error ?? 'Failed to start setup', type: 'error' })
        setConnectLoading(false)
      }
    } catch {
      setMessage({ text: 'Network error — please try again', type: 'error' })
      setConnectLoading(false)
    }
  }

  async function handleWithdraw() {
    const amt = Number(withdrawAmount)
    if (!amt || amt < 1) return
    if (amt > balance) {
      setMessage({ text: 'Amount exceeds your available balance', type: 'error' })
      return
    }
    setWithdrawLoading(true)
    setMessage(null)
    const res = await fetch('/api/stripe/connect/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessage({ text: `£${amt.toFixed(2)} is on its way to your bank account.`, type: 'success' })
      setWithdrawAmount('')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setMessage({ text: json.error ?? 'Withdrawal failed', type: 'error' })
    }
    setWithdrawLoading(false)
  }

  const totalEarned = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalOut    = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Earnings from completed jobs · withdraw anytime</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center gap-2 mb-1 opacity-75">
          <Wallet className="w-4 h-4" />
          <span className="text-sm">Available Balance</span>
        </div>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/20 text-sm">
          <div>
            <p className="opacity-60 text-xs">Total Earned</p>
            <p className="font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />{formatCurrency(totalEarned)}
            </p>
          </div>
          <div>
            <p className="opacity-60 text-xs">Total Withdrawn</p>
            <p className="font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />{formatCurrency(totalOut)}
            </p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div className={`mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Withdraw section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-blue-500" />
          Withdraw to Bank
        </h3>

        {onboarded === null ? (
          <p className="text-sm text-gray-400">Checking account status...</p>
        ) : !onboarded ? (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Connect your bank account to withdraw earnings directly.
            </p>
            <button
              onClick={handleSetupPayouts}
              disabled={connectLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {connectLoading ? 'Loading...' : 'Connect Bank Account'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-green-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Bank account connected
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  type="number" min="1" step="1"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) < 1}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {withdrawLoading ? '...' : 'Withdraw'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Available: {formatCurrency(balance)} · Minimum withdrawal £1
            </p>
          </div>
        )}
      </div>

      {/* How you get paid info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <PoundSterling className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">How you get paid</p>
            <p className="text-xs text-blue-600 mt-1 leading-relaxed">
              When your company marks a completed job as paid, the amount is added to your wallet balance. You can withdraw to your bank account at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No transactions yet</p>
            <p className="text-xs text-gray-300 mt-1">Payments from completed jobs will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    {TX_ICON[tx.type] ?? <PoundSterling className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{TX_LABEL[tx.type] ?? tx.type}</p>
                    {tx.description && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[220px] truncate">{tx.description}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
