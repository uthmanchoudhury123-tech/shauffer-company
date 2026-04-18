'use client'

import { useState } from 'react'
import { Camera, Car, FileText, User, Phone, CheckCircle2, ChevronRight, ArrowLeft, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CAR_TYPES = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']
const CAR_LABELS: Record<string, string> = {
  saloon: 'Saloon', estate: 'Estate', suv: 'SUV', mpv: 'MPV',
  minibus: 'Minibus', executive: 'Executive', van: 'Van',
}

const STEPS = ['Your Details', 'Vehicle', 'Licence']

export function DriverOnboardingClient({
  userId,
  defaultName,
  email,
  role,
}: {
  userId: string
  defaultName: string
  email: string
  role: string
}) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Step 0
  const [fullName, setFullName] = useState(defaultName)
  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  // Step 1
  const [carType, setCarType] = useState('saloon')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [uploadingVehicle, setUploadingVehicle] = useState(false)

  // Step 2
  const [licenceNumber, setLicenceNumber] = useState('')
  const [licenceExpiry, setLicenceExpiry] = useState('')

  const isFreelancer = role === 'freelance_driver'

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const path = `driver-photos/${userId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: url } = supabase.storage.from('avatars').getPublicUrl(path)
      setPhotoUrl(url.publicUrl)
    }
    setUploading(false)
  }

  function canProceed() {
    if (step === 0) return fullName.trim().length > 0
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')

    const res = await fetch('/api/driver/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        car_type: carType,
        vehicle_photo_url: vehiclePhotoUrl || null,
        licence_number: licenceNumber,
        licence_expiry: licenceExpiry || null,
        photo_url: photoUrl || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setSaving(false)
      return
    }

    window.location.href = isFreelancer ? '/dashboard/freelancer' : '/dashboard/driver'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Car className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your driver profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isFreelancer ? 'Freelancer portal' : 'Company driver portal'} · Takes 2 minutes
          </p>
        </div>

        {/* Steps */}
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

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* ── Step 0: Your Details ── */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Profile photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <User className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <span className="text-xs text-white">…</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400">Profile photo <span className="text-gray-300">(optional)</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+44 7700 900000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Vehicle ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Vehicle photo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Vehicle Photo <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-20 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {vehiclePhotoUrl
                      ? <img src={vehiclePhotoUrl} alt="Vehicle" className="w-full h-full object-cover" />
                      : <Car className="w-8 h-8 text-gray-300" />
                    }
                  </div>
                  <div>
                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-xs font-medium text-gray-600">
                      <Camera className="w-3.5 h-3.5" />
                      {uploadingVehicle ? 'Uploading…' : vehiclePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file" accept="image/*" className="hidden"
                        disabled={uploadingVehicle}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingVehicle(true)
                          const supabase = createClient()
                          const path = `driver-vehicles/${userId}/${Date.now()}-${file.name}`
                          const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
                          if (!error && data) {
                            const { data: url } = supabase.storage.from('avatars').getPublicUrl(path)
                            setVehiclePhotoUrl(url.publicUrl)
                          }
                          setUploadingVehicle(false)
                        }}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">Shown when applying for jobs</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> Vehicle Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAR_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCarType(t)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        carType === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5 flex-shrink-0" />
                      {CAR_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Licence ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Licence Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={licenceNumber}
                  onChange={e => setLicenceNumber(e.target.value)}
                  placeholder="e.g. SMITH901234AB9CD"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Licence Expiry <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={licenceExpiry}
                  onChange={e => setLicenceExpiry(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</p>
                <SummaryRow label="Name" value={fullName} />
                {phone && <SummaryRow label="Phone" value={phone} />}
                <SummaryRow label="Vehicle" value={CAR_LABELS[carType]} />
                {licenceNumber && <SummaryRow label="Licence" value={licenceNumber} />}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium">
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
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : <><CheckCircle2 className="w-4 h-4" /> Go to Dashboard</>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can update all of this from <strong>My Profile</strong> in your dashboard
        </p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-20 flex-shrink-0">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}
