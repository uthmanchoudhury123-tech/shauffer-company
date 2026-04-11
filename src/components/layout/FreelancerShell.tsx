'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { FreelancerSidebar } from './FreelancerSidebar'

interface FreelancerShellProps {
  children: React.ReactNode
  driverName: string
  balance: number
}

export function FreelancerShell({ children, driverName, balance }: FreelancerShellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <FreelancerSidebar driverName={driverName} balance={balance} onClose={() => setOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-gray-950 border-b border-gray-800 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white p-1 -ml-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">[PLATFORM] Freelancer</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
