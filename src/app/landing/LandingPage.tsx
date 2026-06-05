'use client'

import Link from 'next/link'
import {
  Car, LayoutDashboard, Briefcase, MapPin, Users,
  CheckCircle2, ArrowRight, Building2, User, Globe,
  Shield, Clock, TrendingUp, Star,
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Chauffex</span>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 font-medium mb-8">
            <Star className="w-3.5 h-3.5 fill-blue-400" />
            Built for the UK chauffeur industry
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
            The complete platform for{' '}
            <span className="text-blue-500">chauffeur companies</span>{' '}
            & drivers
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage your fleet, dispatch jobs, track drivers in real-time, and grow your transport business — all in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-base transition-colors w-full sm:w-auto justify-center"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl text-base border border-gray-700 transition-colors w-full sm:w-auto justify-center"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-y border-gray-800 bg-gray-900/50 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Real-time', label: 'GPS Tracking' },
            { value: '4 Types', label: 'Licence Management' },
            { value: 'Instant', label: 'Job Dispatch' },
            { value: 'Zero', label: 'Setup Fee' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything your business needs</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">One platform covering the full journey — from fleet to invoice.</p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Large card — Fleet */}
            <div className="sm:col-span-2 lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-blue-600/15 rounded-xl flex items-center justify-center mb-5">
                <Car className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Fleet Management</h3>
              <p className="text-gray-400 leading-relaxed mb-5">
                Add and manage all your vehicles with MOT, insurance, road tax, and service date tracking. Get compliance alerts before they expire.
              </p>
              <div className="flex flex-wrap gap-2">
                {['MOT tracking', 'Insurance alerts', 'Vehicle photos', 'Status updates'].map(tag => (
                  <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">{tag}</span>
                ))}
              </div>
            </div>

            {/* Job Dispatch */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-purple-600/15 rounded-xl flex items-center justify-center mb-5">
                <Briefcase className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Job Dispatch</h3>
              <p className="text-gray-400 leading-relaxed">
                Create, assign, and track jobs in real-time. Multi-stop routes, daily hire, open applications, and counter offers all built in.
              </p>
            </div>

            {/* Driver Portal */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-green-600/15 rounded-xl flex items-center justify-center mb-5">
                <LayoutDashboard className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Driver Portal</h3>
              <p className="text-gray-400 leading-relaxed">
                Drivers get their own dashboard — see assigned jobs, apply for openings, track earnings, and manage their licences.
              </p>
            </div>

            {/* Live Tracking */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-orange-600/15 rounded-xl flex items-center justify-center mb-5">
                <MapPin className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Live Tracking</h3>
              <p className="text-gray-400 leading-relaxed">
                See all your drivers on a live map. GPS updates in real-time so you always know where your fleet is.
              </p>
            </div>

            {/* Large card — Licences */}
            <div className="sm:col-span-2 lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-yellow-600/15 rounded-xl flex items-center justify-center mb-5">
                <Shield className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Licence & Compliance</h3>
              <p className="text-gray-400 leading-relaxed mb-5">
                Store DVLA, TfL Driver, TfL Vehicle and Hertsmere licences with expiry alerts. Get warned at 60, 30, and 14 days before anything expires.
              </p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 60-day warning
                </div>
                <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-full border border-orange-400/20">
                  <Clock className="w-3.5 h-3.5" /> 30-day alert
                </div>
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                  <Clock className="w-3.5 h-3.5" /> 14-day urgent
                </div>
              </div>
            </div>

            {/* Marketplace */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-cyan-600/15 rounded-xl flex items-center justify-center mb-5">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Job Marketplace</h3>
              <p className="text-gray-400 leading-relaxed">
                Freelance drivers can browse and apply for platform jobs. Admins post, drivers apply, everyone earns.
              </p>
            </div>

            {/* Earnings */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors cursor-default">
              <div className="w-11 h-11 bg-pink-600/15 rounded-xl flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Revenue Tracking</h3>
              <p className="text-gray-400 leading-relaxed">
                See revenue, driver costs and profit across today, this week, this month and all time. Full P&L at a glance.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-900/40 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for everyone in the industry</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">One platform, three types of user — each with their own tailored experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Company Admin */}
            <div className="relative bg-gray-900 border border-blue-500/30 rounded-2xl p-7">
              <div className="absolute top-5 right-5 text-[10px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-1 rounded-full">ADMIN</div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Company Admin</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Full control over your entire operation. Manage your fleet, drivers, jobs, invoices and finances from one dashboard.
              </p>
              <ul className="space-y-2">
                {[
                  'Fleet & compliance management',
                  'Job creation & driver assignment',
                  'Revenue & profit tracking',
                  'Driver invitation & management',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Set up your company <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Company Driver */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors">
              <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Company Driver</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Join your company via an invite link and access your personal driver portal with all assigned work.
              </p>
              <ul className="space-y-2">
                {[
                  'View & manage assigned jobs',
                  'Track your earnings',
                  'Store licence documents',
                  'Meet & greet sign-off',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-gray-500">
                Join via company invitation link only
              </p>
            </div>

            {/* Freelance Driver */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors">
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-5">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Freelance Driver</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Work independently. Browse platform jobs, apply for work, post your own jobs, and manage your entire driving career.
              </p>
              <ul className="space-y-2">
                {[
                  'Browse marketplace jobs',
                  'Apply with counter offers',
                  'Post jobs to subcontract',
                  'Manage licences & earnings',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-6 flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                Create free account <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 sm:p-14">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-gray-400 mb-8 text-lg">
              Join transport companies and drivers already using Chauffex to run their businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-base transition-colors justify-center"
              >
                Create account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-8 py-3.5 text-gray-300 hover:text-white font-medium rounded-xl text-base border border-gray-700 hover:border-gray-600 transition-colors justify-center"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="font-semibold text-white">Chauffex</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Chauffex. Built for the UK chauffeur industry.
          </p>
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <Link href="/auth/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
            <Link href="/auth/signup" className="hover:text-gray-300 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
