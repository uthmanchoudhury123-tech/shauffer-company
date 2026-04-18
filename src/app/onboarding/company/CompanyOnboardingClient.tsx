'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Phone, Mail, Globe, MapPin, FileText, Camera, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = ['Company Info', 'Contact & Location', 'Branding']

export function CompanyOnboardingClient() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Step 1
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Step 2
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('United Kingdom')

  // Step 3
  const [logoUrl, setLogoUrl] = useState('')

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

  function canProceed() {
    if (step === 0) return name.trim().length > 0
    if (step === 1) return true // all optional
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')

    const res = await fetch('/api/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, description, phone, email, website,
        address, city, postcode, country,
        logo_url: logoUrl || null,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create company')
      setSaving(false)
      return
    }

    router.push('/dashboard/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your company</h1>
          <p className="text-gray-500 text-sm mt-1">Takes 2 minutes — you can update everything later</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                i < step ? 'text-blue-600' : i === step ? 'text-gray-900' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* ── Step 0: Company Info ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Prestige Chauffeurs Ltd"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Short Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Premium chauffeur service covering London and the South East"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Contact & Location ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Business Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="info@yourcompany.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Website
                </label>
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Address
                </label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 High Street"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-1 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">City</label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="London"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Postcode</label>
                  <input
                    value={postcode}
                    onChange={e => setPostcode(e.target.value)}
                    placeholder="SW1A 1AA"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Country</label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
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
          )}

          {/* ── Step 2: Branding ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-3">
                  Company Logo <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 w-fit">
                      <Camera className="w-4 h-4" />
                      {uploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                    </label>
                    <p className="text-xs text-gray-400 mt-1.5">PNG, JPG or SVG — shown on driver signs & invoices</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</p>
                <SummaryRow label="Company" value={name} />
                {description && <SummaryRow label="Description" value={description} />}
                {phone && <SummaryRow label="Phone" value={phone} />}
                {email && <SummaryRow label="Email" value={email} />}
                {city && <SummaryRow label="Location" value={[city, postcode, country].filter(Boolean).join(', ')} />}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving || !canProceed()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating…' : <><CheckCircle2 className="w-4 h-4" /> Launch Dashboard</>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can update all of this from <strong>Settings</strong> in your dashboard
        </p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-700 font-medium truncate">{value}</span>
    </div>
  )
}
