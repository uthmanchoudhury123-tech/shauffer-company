'use client'

import Link from 'next/link'
import { Building2, ChevronRight } from 'lucide-react'

export function CompanySetupBanner() {
  return (
    <Link
      href="/onboarding/company"
      className="w-full bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-3 flex items-center gap-3 transition-colors text-left"
    >
      <Building2 className="w-4 h-4 text-blue-200 flex-shrink-0" />
      <span className="text-sm text-white flex-1">
        <strong>Action required:</strong> Set up your company to start inviting drivers and managing jobs
      </span>
      <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
    </Link>
  )
}
