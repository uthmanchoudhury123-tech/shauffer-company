'use client'

import { useState } from 'react'
import { Camera, Save, CheckCircle2, Star, Car, Shield, Phone, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { carTypeLabel } from '@/lib/utils'

const CAR_TYPES = ['saloon','estate','suv','mpv','minibus','executive','van']

interface Profile { full_name: string; email: string }
interface Driver {
  car_type: string
  licence_number: string | null
  licence_expiry: string | null
  photo_url: string | null
  phone: string | null
  rating: number
  rating_count: number
  is_verified: boolean
}

export function FreelancerProfileClient({
  userId,
  profile,
  driver,
}: {
  userId: string
  profile: Profile | null
  driver: Driver | null
}) {
  const [fullName, setFullName]           = useState(profile?.full_name ?? '')
  const [phone, setPhone]                 = useState(driver?.phone ?? '')
  const [carType, setCarType]             = useState(driver?.car_type ?? 'saloon')
  const [licenceNumber, setLicenceNumber] = useState(driver?.licence_number ?? '')
  const [licenceExpiry, setLicenceExpiry] = useState(driver?.licence_expiry ?? '')
  const [photoUrl, setPhotoUrl]           = useState(driver?.photo_url ?? '')
  const [saving, setSaving]               = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState('')

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

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('user_profiles').update({ full_name: fullName }).eq('id', userId),
      supabase.from('drivers').update({
        full_name: fullName,
        phone: phone || null,
        car_type: carType,
        licence_number: licenceNumber || null,
        licence_expiry: licenceExpiry || null,
        photo_url: photoUrl || null,
      }).eq('id', userId),
    ])

    if (e1 || e2) setError(e1?.message ?? e2?.message ?? 'Failed to save')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const rating = driver?.rating ?? 0
  const ratingCount = driver?.rating_count ?? 0

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your details visible to companies posting jobs</p>
      </div>

      {/* Profile hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-white/20" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold border-2 border-white/20">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-gray-100 transition-colors">
              <Camera className="w-3.5 h-3.5 text-gray-700" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <span className="text-xs text-white">...</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold truncate">{fullName || 'Your Name'}</h2>
              <span className="flex items-center gap-1 text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                <Zap className="w-3 h-3" /> Freelancer
              </span>
            </div>
            <p className="text-sm text-white/60">{profile?.email}</p>
            {phone && <p className="text-sm text-white/50 mt-0.5">{phone}</p>}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 fill-white/20'}`} />
                ))}
                <span className="text-xs text-white/60 ml-1">{rating > 0 ? `${rating.toFixed(1)} (${ratingCount})` : 'No ratings yet'}</span>
              </div>
              {driver?.is_verified && (
                <span className="flex items-center gap-1 text-xs text-blue-400">
                  <Shield className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-gray-400" /> Phone
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+44 7700 900000" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
          <input value={profile?.email ?? ''} disabled
            className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Vehicle Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CAR_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setCarType(t)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  carType === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                <Car className="w-3.5 h-3.5 flex-shrink-0" />
                {carTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Licence Number</label>
            <input value={licenceNumber} onChange={e => setLicenceNumber(e.target.value)}
              placeholder="e.g. SMITH901234AB9CD"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Licence Expiry</label>
            <input type="date" value={licenceExpiry} onChange={e => setLicenceExpiry(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors
              ${saved ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'} disabled:opacity-50`}>
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
             saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}
