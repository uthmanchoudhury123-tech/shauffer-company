'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'company_admin',
    label: 'Company Admin',
    description: 'Manage your fleet, drivers, and jobs',
  },
  {
    value: 'company_driver',
    label: 'Company Driver',
    description: 'View and manage your assigned jobs',
  },
  {
    value: 'freelance_driver',
    label: 'Freelance Driver',
    description: 'Work independently across companies',
  },
]

interface Props {
  inviteToken?: string
  inviteEmail?: string
}

export function SignupClient({ inviteToken, inviteEmail }: Props) {
  const router = useRouter()
  const isInvited = !!inviteToken

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(inviteEmail ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(isInvited ? 'company_driver' : 'company_admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Embed invite token in metadata so DB trigger can auto-link company
        data: {
          full_name: fullName,
          role,
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // If coming from an invite, also call use-invite directly using the
    // user id returned from signUp (works even before email confirmation)
    if (inviteToken && signUpData.user) {
      const res = await fetch('/api/invite/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, userId: signUpData.user.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to apply invite')
        setLoading(false)
        return
      }
      router.push('/dashboard/driver')
    } else if (role === 'company_admin') {
      router.push('/dashboard/admin')
    } else {
      router.push('/dashboard/driver')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Chauffex</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {isInvited ? 'Complete your account setup' : 'Create your account'}
          </p>
        </div>

        {/* Invite banner */}
        {isInvited && (
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-blue-400 text-sm font-medium">You&apos;re joining via an invite link</p>
            <p className="text-gray-400 text-xs mt-0.5">Your account will be linked to the company automatically</p>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-sm"
                placeholder="John Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                readOnly={isInvited && !!inviteEmail}
                className={`w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-sm
                           ${isInvited && inviteEmail ? 'opacity-70 cursor-not-allowed' : ''}`}
                placeholder="you@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white
                           placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent text-sm"
                placeholder="Minimum 8 characters"
              />
            </div>

            {/* Role Selection — hidden for invited drivers */}
            {!isInvited && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">I am a...</label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        role === option.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <p className={`text-sm font-medium ${role === option.value ? 'text-blue-400' : 'text-gray-200'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm
                         transition-colors duration-200"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
