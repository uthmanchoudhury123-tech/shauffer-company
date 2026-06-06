'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, ShieldCheck, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  /** Called when the phone is successfully verified */
  onVerified?: (phone: string) => void
  /** Pre-fill with an existing phone number */
  defaultPhone?: string
  /** Whether this phone is already verified (shows verified badge) */
  alreadyVerified?: boolean
  /** Optional CSS classes for the wrapper */
  className?: string
}

type Step = 'phone' | 'code' | 'done'

export function PhoneVerification({ onVerified, defaultPhone = '', alreadyVerified = false, className = '' }: Props) {
  const [step, setStep] = useState<Step>(alreadyVerified ? 'done' : 'phone')
  const [phone, setPhone] = useState(defaultPhone)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  function startCooldown() {
    setCooldown(60)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function sendCode() {
    if (!phone.trim()) { setError('Please enter your phone number.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code')
      setStep('code')
      setCode(['', '', '', '', '', ''])
      startCooldown()
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function verifyCode() {
    const fullCode = code.join('')
    if (fullCode.length < 6) { setError('Enter the full 6-digit code.'); return }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verification failed')
      setStep('done')
      onVerified?.(phone.trim())
    } catch (e: any) {
      setError(e.message)
      setCode(['', '', '', '', '', ''])
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    } finally {
      setVerifying(false)
    }
  }

  function handleCodeInput(idx: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[idx] = digit
    setCode(newCode)
    if (digit && idx < 5) {
      codeRefs.current[idx + 1]?.focus()
    }
    // Auto-submit when all 6 digits filled
    if (newCode.every(d => d !== '') && digit) {
      setTimeout(() => verifyCode(), 100)
    }
  }

  function handleCodeKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newCode = [...code]
      pasted.split('').forEach((d, i) => { if (i < 6) newCode[i] = d })
      setCode(newCode)
      const lastFilled = Math.min(pasted.length, 5)
      codeRefs.current[lastFilled]?.focus()
      if (pasted.length === 6) setTimeout(() => verifyCode(), 100)
    }
  }

  if (step === 'done') {
    return (
      <div className={`flex items-center gap-2.5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl ${className}`}>
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Phone verified</p>
          <p className="text-xs text-green-600">{phone || defaultPhone}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {step === 'phone' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-gray-400 font-normal">(for SMS verification)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendCode()}
                placeholder="+44 7700 900000"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={sendCode}
              disabled={sending || !phone.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send Code'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>
      )}

      {step === 'code' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              Enter the 6-digit code sent to {phone}
            </label>
            <button onClick={() => setStep('phone')} className="text-xs text-gray-400 hover:text-gray-600">
              Change number
            </button>
          </div>
          <div className="flex gap-2 mb-3" onPaste={handleCodePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { codeRefs.current[idx] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeInput(idx, e.target.value)}
                onKeyDown={e => handleCodeKeyDown(idx, e)}
                className={`w-10 h-12 text-center text-lg font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  digit ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={verifyCode}
              disabled={verifying || code.some(d => !d)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={sendCode}
              disabled={sending || cooldown > 0}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}
