'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronRight } from 'lucide-react'

export function CompanySetupBanner() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create company')
      setSaving(false)
      return
    }

    router.refresh()
  }

  if (open) {
    return (
      <div className="bg-blue-600 px-4 sm:px-6 py-4">
        <p className="text-white font-semibold text-sm mb-3">Set up your company to get started</p>
        <form onSubmit={handleCreate} className="flex gap-2 flex-wrap">
          <input
            type="text"
            required
            placeholder="Company name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-white text-blue-700 font-semibold text-sm rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating...' : 'Create Company'}
          </button>
        </form>
        {error && <p className="text-blue-200 text-xs mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-3 flex items-center gap-3 transition-colors text-left"
    >
      <Building2 className="w-4 h-4 text-blue-200 flex-shrink-0" />
      <span className="text-sm text-white flex-1">
        <strong>Action required:</strong> Set up your company to start inviting drivers and managing jobs
      </span>
      <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
    </button>
  )
}
