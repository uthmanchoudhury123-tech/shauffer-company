'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import {
  Car, LayoutDashboard, Briefcase, MapPin,
  CheckCircle2, ArrowRight, Building2, User, Globe,
  Shield, TrendingUp, Users, ChevronRight,
} from 'lucide-react'

/* ── Scroll-animation hook ─────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.delay ?? '0'
            setTimeout(() => {
              el.style.opacity = '1'
              el.style.transform = 'translateY(0)'
            }, Number(delay))
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(28px)'
      el.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)'
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])
}

/* ── Logo mark ─────────────────────────────────────────── */
function LogoMark({ size = 8 }: { size?: number }) {
  const px = size * 4
  return (
    <div
      className="bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ width: px, height: px }}
    >
      <svg width={px * 0.6} height={px * 0.6} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </div>
  )
}

/* ── Feature data (3 × 2 — no orphan cards) ────────────── */
const FEATURES = [
  {
    icon: Car, color: 'blue',
    title: 'Fleet Management',
    desc: 'Add vehicles with MOT, insurance, road tax and service tracking. Compliance alerts fire before anything expires.',
    tags: ['MOT tracking', 'Insurance alerts', 'Vehicle photos'],
  },
  {
    icon: Briefcase, color: 'purple',
    title: 'Job Dispatch',
    desc: 'Create and assign jobs in seconds. Multi-stop routes, daily hire, open applications and counter-offers all built in.',
    tags: ['Multi-stop', 'Counter offers', 'Real-time'],
  },
  {
    icon: LayoutDashboard, color: 'green',
    title: 'Driver Portal',
    desc: "Drivers get their own dashboard — view assigned work, apply for open jobs, track earnings and manage licences.",
    tags: ['Personal dashboard', 'Earnings', 'Licences'],
  },
  {
    icon: MapPin, color: 'orange',
    title: 'Live Tracking',
    desc: 'See every driver on a live Mapbox map. GPS updates in real-time so you always know where your fleet is.',
    tags: ['GPS map', 'Real-time', 'Fleet view'],
  },
  {
    icon: Shield, color: 'yellow',
    title: 'Licence & Compliance',
    desc: 'Store DVLA, TfL Driver, TfL Vehicle and Hertsmere licences. Warned at 60, 30 and 14 days before expiry.',
    tags: ['60-day warning', '30-day alert', '14-day urgent'],
  },
  {
    icon: TrendingUp, color: 'pink',
    title: 'Revenue & Earnings',
    desc: 'Full P&L at a glance — revenue, driver costs and profit across today, this week, this month and all time.',
    tags: ['P&L dashboard', 'Driver costs', 'All-time'],
  },
]

const COLOR_MAP: Record<string, { icon: string; bg: string; tag: string }> = {
  blue:   { icon: 'text-blue-400',   bg: 'bg-blue-500/10',   tag: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  purple: { icon: 'text-purple-400', bg: 'bg-purple-500/10', tag: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  green:  { icon: 'text-green-400',  bg: 'bg-green-500/10',  tag: 'bg-green-500/10 text-green-300 border-green-500/20' },
  orange: { icon: 'text-orange-400', bg: 'bg-orange-500/10', tag: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  yellow: { icon: 'text-yellow-400', bg: 'bg-yellow-500/10', tag: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  pink:   { icon: 'text-pink-400',   bg: 'bg-pink-500/10',   tag: 'bg-pink-500/10 text-pink-300 border-pink-500/20' },
}

/* ══════════════════════════════════════════════════════════
   LandingPage
   ══════════════════════════════════════════════════════════ */
export function LandingPage() {
  useReveal()

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={8} />
            <span className="font-bold text-[17px] tracking-tight">Chauffex</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer">
              Sign in
            </Link>
            <Link href="/auth/signup"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-28 pb-32 px-5 sm:px-8 overflow-hidden">
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.13) 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Pill */}
          <div data-reveal data-delay="0"
            className="inline-flex items-center gap-2 border border-blue-500/25 bg-blue-500/8 rounded-full px-4 py-1.5 text-[13px] text-blue-400 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built for the chauffeur industry
          </div>

          {/* Headline */}
          <h1 data-reveal data-delay="80"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-7">
            The platform for<br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              chauffeur companies
            </span><br />
            <span className="text-gray-300">&amp; drivers</span>
          </h1>

          <p data-reveal data-delay="160"
            className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-11 leading-relaxed">
            Manage your fleet, dispatch jobs, track drivers in real-time, and grow your transport business — all in one place.
          </p>

          {/* CTAs */}
          <div data-reveal data-delay="240"
            className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-[15px] transition-colors w-full sm:w-auto justify-center cursor-pointer">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-gray-300 hover:text-white font-medium rounded-xl text-[15px] border border-white/10 hover:border-white/20 transition-colors w-full sm:w-auto justify-center cursor-pointer">
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────── */}
      <div className="border-y border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Real-time', label: 'GPS Tracking' },
            { value: '4 Types',   label: 'Licence Management' },
            { value: 'Instant',   label: 'Job Dispatch' },
            { value: 'Zero',      label: 'Setup Fee' },
          ].map(({ value, label }, i) => (
            <div key={label} data-reveal data-delay={String(i * 60)}>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything your business needs</h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">One platform covering the full journey — fleet to invoice.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {FEATURES.map((f, i) => {
              const c = COLOR_MAP[f.color]
              const Icon = f.icon
              return (
                <div key={f.title}
                  data-reveal data-delay={String((i % 3) * 80)}
                  className="bg-[#030712] p-8 hover:bg-gray-900/60 transition-colors group cursor-default">
                  <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-5`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} />
                  </div>
                  <h3 className="text-[17px] font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tags.map(tag => (
                      <span key={tag} className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${c.tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Who it's for ───────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-3">Who it's for</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">One platform, three roles</h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">Each user type gets a tailored experience built around their needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Company Admin */}
            <div data-reveal data-delay="0"
              className="relative bg-gray-900/50 border border-blue-500/20 rounded-2xl p-8 hover:border-blue-500/40 transition-colors">
              <div className="absolute top-6 right-6 text-[10px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full tracking-wider">
                ADMIN
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Company Admin</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Full control over your entire operation — fleet, drivers, jobs, invoices and revenue from one dashboard.
              </p>
              <ul className="space-y-2.5 mb-7">
                {['Fleet & compliance management', 'Job creation & driver assignment', 'Revenue & profit tracking', 'Driver invitation & management'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                Set up your company <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Company Driver */}
            <div data-reveal data-delay="100"
              className="bg-gray-900/50 border border-white/8 rounded-2xl p-8 hover:border-white/15 transition-colors">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Company Driver</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Join via your company invite link and access a personal driver portal with all your assigned work.
              </p>
              <ul className="space-y-2.5 mb-7">
                {['View & manage assigned jobs', 'Track your earnings', 'Store licence documents', 'Meet & greet sign-off'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-600">Join via company invitation link</p>
            </div>

            {/* Freelance Driver */}
            <div data-reveal data-delay="200"
              className="bg-gray-900/50 border border-white/8 rounded-2xl p-8 hover:border-white/15 transition-colors">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Freelance Driver</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Work independently. Browse jobs, post your own, apply with counter-offers, and manage your career.
              </p>
              <ul className="space-y-2.5 mb-7">
                {['Browse marketplace jobs', 'Apply with counter offers', 'Post jobs to subcontract', 'Manage licences & earnings'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
                Create free account <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8 border-t border-white/5">
        <div data-reveal className="max-w-2xl mx-auto text-center">
          <LogoMark size={14} />
          <h2 className="mt-8 text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
            Join transport companies and drivers already using Chauffex to run their businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-[15px] transition-colors justify-center cursor-pointer">
              Create account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center px-8 py-3.5 text-gray-400 hover:text-white font-medium rounded-xl text-[15px] border border-white/10 hover:border-white/20 transition-colors justify-center cursor-pointer">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={7} />
            <span className="font-semibold text-white">Chauffex</span>
          </div>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Chauffex. Built for the chauffeur industry.
          </p>
          <div className="flex items-center gap-5 text-sm text-gray-600">
            <Link href="/auth/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
            <Link href="/auth/signup" className="hover:text-gray-300 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
