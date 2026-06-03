// ============================================================
// Chauffex Auth Proxy (Next.js 16 — renamed from middleware)
// Runs on every request to protect routes and handle role-based
// redirects after login.
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/auth/reset-password', '/']

// Role → default dashboard path
const ROLE_DASHBOARD: Record<string, string> = {
  company_admin:    '/dashboard/admin',
  company_driver:   '/dashboard/driver',
  freelance_driver: '/dashboard/driver',
  super_admin:      '/dashboard/superadmin',
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — IMPORTANT: do not remove this
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))

  // Not logged in, trying to access protected route → redirect to login
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Helper: look up role + company, redirect to correct dashboard (or onboarding)
  async function redirectToDashboard() {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user!.id)
      .single()

    const role = profile?.role ?? 'company_driver'

    // Company admin with no company → must complete onboarding first
    if (role === 'company_admin' && !profile?.company_id) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/company'
      return NextResponse.redirect(url)
    }

    const dashboardPath = ROLE_DASHBOARD[role] ?? '/dashboard/driver'
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = dashboardPath
    return NextResponse.redirect(dashboardUrl)
  }

  // Logged in + hitting a route that needs role-based redirect
  if (user && (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/auth/login' ||
    pathname === '/auth/signup'
  )) {
    return redirectToDashboard()
  }

  // Anyone hitting the old /dashboard/freelancer → send to /dashboard/driver
  if (pathname.startsWith('/dashboard/freelancer')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace('/dashboard/freelancer', '/dashboard/driver')
    return NextResponse.redirect(url)
  }

  // Company admin accessing their dashboard — check they have a company
  if (user && pathname.startsWith('/dashboard/admin')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'company_admin' && !profile?.company_id) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/company'
      return NextResponse.redirect(url)
    }
  }

  // Driver/freelancer accessing their dashboard — check onboarding is complete
  // Uses service-role key (bypasses RLS) because the anon session context in
  // middleware doesn't reliably set auth.uid() for PostgREST RLS policies.
  if (user && pathname.startsWith('/dashboard/driver')) {
    const { createClient: createAdminSupa } = await import('@supabase/supabase-js')
    const adminCheck = createAdminSupa(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: driver } = await adminCheck
      .from('drivers')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    if (!driver?.onboarding_complete) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/driver'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except static assets and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
