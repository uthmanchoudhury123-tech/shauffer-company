'use client'

import { useState } from 'react'
import { Building2, Phone, Mail, Globe, MapPin, Camera, Save, CheckCircle2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string
  name: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  postcode: string | null
  country: string | null
  description: string | null
  logo_url: string | null
}

export function CompanySettingsClient({
  company,
  adminName,
  adminEmail,
  userId,
}: {
  company: Company | null
  adminName: string
  adminEmail: string
  userId: string
}) {
  const [name, setName]               = useState(company?.name ?? '')
  const [description, setDescription] = useState(company?.description ?? '')
  const [phone, setPhone]             = useState(company?.phone ?? '')
  const [email, setEmail]             = useState(company?.email ?? '')
  const [website, setWebsite]         = useState(company?.website ?? '')
  const [address, setAddress]         = useState(company?.address ?? '')
  const [city, setCity]               = useState(company?.city ?? '')
  const [postcode, setPostcode]       = useState(company?.postcode ?? '')
  const [country, setCountry]         = useState(company?.country ?? 'United Kingdom')
  const [logoUrl, setLogoUrl]         = useState(company?.logo_url ?? '')

  // Admin profile
  const [fullName, setFullName]       = useState(adminName)

  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const path = `company-logos/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: url } = supabase.storage.from('avatars').getPublicUrl(path)
      setLogoUrl(url.publicUrl)
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const supabase = createClient()

    // Update admin's display name in parallel with company update
    const [companyRes] = await Promise.all([
      fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, phone, email, website,
          address, city, postcode, country,
          logo_url: logoUrl || null,
        }),
      }),
      supabase.from('user_profiles').update({ full_name: fullName }).eq('id', userId),
    ])

    if (!companyRes.ok) {
      const data = await companyRes.json()
      setError(data.error ?? 'Failed to save')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your company profile and contact details</p>
      </div>

      {/* Logo + name hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              : <Building2 className="w-9 h-9 text-white/40" />
            }
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-gray-100 transition-colors">
            <Camera className="w-3.5 h-3.5 text-gray-700" />
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          </label>
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
              <span className="text-xs text-white">…</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-xl font-bold">{name || 'Your Company'}</p>
          <p className="text-white/50 text-sm">{city ? `${city}, ${country}` : country}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Company details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" /> Company Information
        </h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Prestige Chauffeurs Ltd"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Short description of your service"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-gray-400" /> Phone
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+44 7700 900000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-gray-400" /> Business Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="info@company.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-gray-400" /> Website
          </label>
          <input
            value={website}
            onChange={e => setWebsite(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://yourcompany.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-400" /> Address
          </label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123 High Street"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">City</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="London" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Postcode</label>
            <input value={postcode} onChange={e => setPostcode(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SW1A 1AA" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option>United Kingdom</option>
              <option>Ireland</option>
              <option>United States</option>
              <option>Canada</option>
              <option>Australia</option>
              <option>UAE</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Admin profile section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" /> Your Account
        </h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
          <input
            value={adminEmail}
            disabled
            className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors
          ${saved ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'} disabled:opacity-50`}
      >
        {saved
          ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          : saving ? 'Saving…'
          : <><Save className="w-4 h-4" /> Save Changes</>
        }
      </button>
    </div>
  )
}
