'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, ExternalLink, Banknote } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
  id: string
  amount: number
  type: 'topup' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'escrow_refund' | 'payment_received'
  description: string | null
  created_at: string
}

interface Props {
  balance: number
  transactions: Transaction[]
}

const txLabel: Record<string, string> = {
  topup:            'Wallet Top-Up',
  withdrawal:       'Bank Withdrawal',
  escrow_hold:      'Funds Held (Escrow)',
  escrow_release:   'Escrow Released',
  escrow_refund:    'Escrow Refund',
  payment_received: 'Payment Received',
}

const txIcon: Record<string, React.ReactNode> = {
  topup:            <ArrowDownCircle className="w-4 h-4 text-green-500" />,
  withdrawal:       <ArrowUpCircle className="w-4 h-4 text-red-500" />,
  escrow_hold:      <Lock className="w-4 h-4 text-yellow-500" />,
  escrow_release:   <Lock className="w-4 h-4 text-gray-400" />,
  escrow_refund:    <ArrowDownCircle className="w-4 h-4 text-green-500" />,
  payment_received: <TrendingUp className="w-4 h-4 text-green-500" />,
}

export function WalletClient({ balance, transactions }: Props) {
  const searchParams = useSearchParams()
  const [topUpAmount, setTopUpAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Check Stripe Connect status
  useEffect(() => {
    fetch('/api/stripe/connect/status')
      .then(r => r.json())
      .then(d => setOnboarded(d.onboarded ?? false))
      .catch(() => setOnboarded(false))
  }, [])

  // Handle return from Stripe
  useEffect(() => {
    const topup = searchParams.get('topup')
    const connect = searchParams.get('connect')
    if (topup === 'success') {
      setMessage({ text: 'Top-up successful! Your balance will update shortly.', type: 'success' })
    } else if (topup === 'cancelled') {
      setMessage({ text: 'Top-up cancelled.', type: 'error' })
    } else if (connect === 'success') {
      setMessage({ text: 'Payout account set up! You can now withdraw to your bank.', type: 'success' })
      setOnboarded(true)
    }
  }, [searchParams])

  async function handleTopUp() {
    if (!topUpAmount || Number(topUpAmount) < 1) return
    setTopUpLoading(true)
    setMessage(null)
    const res = await fetch('/api/stripe/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(topUpAmount) }),
    })
    const json = await res.json()
    if (res.ok && json.url) {
      window.location.href = json.url
    } else {
      setMessage({ text: json.error ?? 'Failed to start payment', type: 'error' })
      setTopUpLoading(false)
    }
  }

  async function handleSetupPayouts() {
    setConnectLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        setMessage({ text: json.error ?? `Error ${res.status}: Failed to start onboarding`, type: 'error' })
        setConnectLoading(false)
      }
    } catch (err: any) {
      setMessage({ text: err.message ?? 'Network error — please try again', type: 'error' })
      setConnectLoading(false)
    }
  }

  async function handleWithdraw() {
    if (!withdrawAmount || Number(withdrawAmount) < 1) return
    if (Number(withdrawAmount) > balance) {
      setMessage({ text: 'Insufficient balance', type: 'error' })
      return
    }
    setWithdrawLoading(true)
    setMessage(null)
    const res = await fetch('/api/stripe/connect/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(withdrawAmount) }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessage({ text: `£${withdrawAmount} is on its way to your bank account.`, type: 'success' })
      setWithdrawAmount('')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setMessage({ text: json.error ?? 'Withdrawal failed', type: 'error' })
    }
    setWithdrawLoading(false)
  }

  const totalIn  = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <p className="text-gray-400 text-sm mt-0.5">Add money, withdraw to bank, track earnings</p>
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <Wallet className="w-4 h-4" />
            <span className="text-sm">Available Balance</span>
          </div>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/20 text-sm">
            <div>
              <p className="opacity-60 text-xs">Total In</p>
              <p className="font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />{formatCurrency(totalIn)}
              </p>
            </div>
            <div>
              <p className="opacity-60 text-xs">Total Out</p>
              <p className="font-semibold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />{formatCurrency(totalOut)}
              </p>
            </div>
          </div>
        </div>

        {/* Alert message */}
        {message && (
          <div className={`mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Actions grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Top up */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-green-400" />
              Add Money
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  type="number" min="1" step="1"
                  className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                />
              </div>
              <button
                onClick={handleTopUp}
                disabled={topUpLoading || !topUpAmount || Number(topUpAmount) < 1}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                {topUpLoading ? '...' : <><ExternalLink className="w-3.5 h-3.5" /> Pay</>}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Secure card payment via Stripe</p>
          </div>

          {/* Withdraw */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-blue-400" />
              Withdraw to Bank
            </h3>

            {onboarded === null ? (
              <p className="text-xs text-gray-500">Checking account status...</p>
            ) : !onboarded ? (
              <div>
                <p className="text-xs text-gray-400 mb-3">Set up your bank account to receive withdrawals</p>
                <button
                  onClick={handleSetupPayouts}
                  disabled={connectLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {connectLoading ? 'Loading...' : 'Set Up Payouts'}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                    <input
                      type="number" min="1" step="1"
                      className="w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) < 1}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {withdrawLoading ? '...' : 'Send'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> Bank account connected
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">Transaction History</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {txIcon[tx.type]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{txLabel[tx.type] ?? tx.type}</p>
                      {tx.description && (
                        <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{tx.description}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
