'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Search, AlertTriangle, CheckCircle, ShieldOff, Shield } from 'lucide-react'

interface Company {
  id: string
  name: string
  is_active: boolean
  is_suspended: boolean
  subscription_plan: string
  created_at: string
  driverCount: number
}

export function CompaniesClient({ companies: initial }: { companies: Company[] }) {
  const router = useRouter()
  const [companies, setCompanies] = useState(initial)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleSuspend(company: Company) {
    setLoading(company.id)
    const res = await fetch('/api/superadmin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: company.id, is_suspended: !company.is_suspended }),
    })
    if (res.ok) {
      setCompanies(prev =>
        prev.map(c => c.id === company.id ? { ...c, is_suspended: !c.is_suspended } : c)
      )
    }
    setLoading(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companies.length} total</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No companies found</p>
            </div>
          ) : (
            filtered.map(company => (
              <div key={company.id} className="flex items-center justify-between px-5 py-4 gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    company.is_suspended ? 'bg-red-100' : 'bg-purple-100'
                  }`}>
                    <Building2 className={`w-4 h-4 ${company.is_suspended ? 'text-red-500' : 'text-purple-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{company.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        company.subscription_plan === 'enterprise' ? 'bg-yellow-100 text-yellow-700' :
                        company.subscription_plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {company.subscription_plan}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {company.driverCount} driver{company.driverCount !== 1 ? 's' : ''}
                      </span>
                      <span>Joined {new Date(company.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`hidden sm:flex items-center gap-1 text-xs font-medium ${
                    company.is_suspended ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {company.is_suspended
                      ? <><AlertTriangle className="w-3.5 h-3.5" /> Suspended</>
                      : <><CheckCircle className="w-3.5 h-3.5" /> Active</>
                    }
                  </span>
                  <button
                    onClick={() => toggleSuspend(company)}
                    disabled={loading === company.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      company.is_suspended
                        ? 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    }`}
                  >
                    {loading === company.id ? '...' : company.is_suspended
                      ? <><Shield className="w-3.5 h-3.5" /> Reactivate</>
                      : <><ShieldOff className="w-3.5 h-3.5" /> Suspend</>
                    }
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
