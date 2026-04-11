'use client'

import { useState } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, TrendingUp, TrendingDown } from 'lucide-react'
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
  topup: 'Top Up',
  withdrawal: 'Withdrawal',
  escrow_hold: 'Funds Held (Escrow)',
  escrow_release: 'Funds Released',
  escrow_refund: 'Escrow Refund',
  payment_received: 'Payment Received',
}

const txIcon: Record<string, React.ReactNode> = {
  topup: <ArrowDownCircle className="w-4 h-4 text-green-500" />,
  withdrawal: <ArrowUpCircle className="w-4 h-4 text-red-500" />,
  escrow_hold: <Lock className="w-4 h-4 text-yellow-500" />,
  escrow_release: <Lock className="w-4 h-4 text-gray-400" />,
  escrow_refund: <ArrowDownCircle className="w-4 h-4 text-green-500" />,
  payment_received: <TrendingUp className="w-4 h-4 text-green-500" />,
}

export function WalletClient({ balance, transactions }: Props) {
  const [topUpAmount, setTopUpAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  async function handleTopUp() {
    if (!topUpAmount || Number(topUpAmount) <= 0) return
    setTopUpLoading(true)
    setMessage(null)
    const res = await fetch('/api/freelancer/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'topup', amount: Number(topUpAmount) }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessage({ text: `£${topUpAmount} added to your wallet`, type: 'success' })
      setTopUpAmount('')
      // Refresh page to update balance
      window.location.reload()
    } else {
      setMessage({ text: json.error, type: 'error' })
    }
    setTopUpLoading(false)
  }

  async function handleWithdraw() {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return
    if (Number(withdrawAmount) > balance) {
      setMessage({ text: 'Insufficient balance', type: 'error' })
      return
    }
    setWithdrawLoading(true)
    setMessage(null)
    const res = await fetch('/api/freelancer/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'withdraw', amount: Number(withdrawAmount) }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessage({ text: `£${withdrawAmount} withdrawal requested`, type: 'success' })
      setWithdrawAmount('')
      window.location.reload()
    } else {
      setMessage({ text: json.error, type: 'error' })
    }
    setWithdrawLoading(false)
  }

  const totalIn = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalOut = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your balance and transactions</p>
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
              <TrendingUp className="w-3.5 h-3.5" />
              {formatCurrency(totalIn)}
            </p>
          </div>
          <div>
            <p className="opacity-60 text-xs">Total Out</p>
            <p className="font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              {formatCurrency(totalOut)}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Top up / Withdraw */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-green-500" />
            Add Money
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                type="number" min="1" step="0.01"
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
              />
            </div>
            <button
              onClick={handleTopUp}
              disabled={topUpLoading || !topUpAmount}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {topUpLoading ? '...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Stripe payment coming soon</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-red-500" />
            Withdraw
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                type="number" min="1" step="0.01"
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading || !withdrawAmount}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {withdrawLoading ? '...' : 'Withdraw'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Bank transfer (Stripe Connect) coming soon</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                    {txIcon[tx.type]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{txLabel[tx.type] ?? tx.type}</p>
                    {tx.description && <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{tx.description}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
