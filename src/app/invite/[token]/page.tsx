import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('email, status, expires_at, companies(name)')
    .eq('token', token)
    .single()

  const isValid =
    invite &&
    invite.status === 'pending' &&
    new Date(invite.expires_at) > new Date()

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600/20 rounded-2xl mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Invite Invalid</h1>
          <p className="text-gray-400 text-sm mb-6">
            This invite link has expired, already been used, or does not exist.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyName = (invite.companies as any)?.name ?? 'your company'
  const signupUrl = `/auth/signup?invite=${token}${invite.email ? `&email=${encodeURIComponent(invite.email)}` : ''}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-5">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Chauffex</h1>
        <p className="text-gray-400 text-sm mb-8">You&apos;ve been invited to join</p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company</p>
          <p className="text-xl font-bold text-white">{companyName}</p>
          {invite.email && (
            <p className="text-sm text-gray-400 mt-2">{invite.email}</p>
          )}
        </div>

        <Link
          href={signupUrl}
          className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     rounded-xl text-sm transition-colors"
        >
          Accept Invite &amp; Create Account
        </Link>

        <p className="text-xs text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gray-400 hover:text-gray-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
