'use client'

import { useState, useRef } from 'react'
import { Camera, Save, CheckCircle2, Star, Car, Shield, Phone, Upload, X, AlertTriangle, FileText, Calendar, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { carTypeLabel } from '@/lib/utils'
import { PhoneVerification } from '@/components/ui/PhoneVerification'

const CAR_TYPES = ['saloon','estate','suv','mpv','minibus','executive','van','hybrid','electric']

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
  availability_status: string
  // Vehicle photos
  vehicle_photo_outside: string | null
  vehicle_photo_inside: string | null
  // DVLA
  dvla_photo_front: string | null
  dvla_photo_back: string | null
  // TFL Driver
  tfl_licence_number: string | null
  tfl_licence_expiry: string | null
  tfl_driver_photo_front: string | null
  tfl_driver_photo_back: string | null
  // TFL Vehicle
  tfl_vehicle_number: string | null
  tfl_vehicle_expiry: string | null
  tfl_vehicle_photo_front: string | null
  tfl_vehicle_photo_back: string | null
  // Hertsmere
  hertsmere_number: string | null
  hertsmere_expiry: string | null
  hertsmere_photo_front: string | null
  hertsmere_photo_back: string | null
  // MOT
  mot_expiry: string | null
}

// Days until expiry — negative = expired
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return null
  if (days < 0)   return <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">EXPIRED</span>
  if (days <= 14) return <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Expires in {days}d</span>
  if (days <= 30) return <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Expires in {days}d</span>
  if (days <= 60) return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Expires in {days}d</span>
  return <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Valid</span>
}

function ExpiryAlert({ label, days }: { label: string; days: number | null }) {
  if (days === null || days > 60) return null
  const colour = days < 0 ? 'red' : days <= 30 ? 'red' : 'amber'
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
      ${colour === 'red' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>
        <strong>{label}</strong> {days < 0 ? 'has expired!' : `expires in ${days} day${days !== 1 ? 's' : ''} — renew soon`}
      </span>
    </div>
  )
}

export function DriverProfileClient({
  userId, profile, driver,
}: {
  userId: string
  profile: Profile | null
  driver: Driver | null
}) {
  const [fullName, setFullName]   = useState(profile?.full_name ?? '')
  const [phone, setPhone]         = useState(driver?.phone ?? '')
  const [carType, setCarType]     = useState(driver?.car_type ?? 'saloon')
  const [photoUrl, setPhotoUrl]   = useState(driver?.photo_url ?? '')
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  // DVLA
  const [dvlaNumber, setDvlaNumber]   = useState(driver?.licence_number ?? '')
  const [dvlaExpiry, setDvlaExpiry]   = useState(driver?.licence_expiry ?? '')
  const [dvlaFront,  setDvlaFront]    = useState(driver?.dvla_photo_front ?? '')
  const [dvlaBack,   setDvlaBack]     = useState(driver?.dvla_photo_back ?? '')
  // TFL Driver
  const [tflDNumber, setTflDNumber]   = useState(driver?.tfl_licence_number ?? '')
  const [tflDExpiry, setTflDExpiry]   = useState(driver?.tfl_licence_expiry ?? '')
  const [tflDFront,  setTflDFront]    = useState(driver?.tfl_driver_photo_front ?? '')
  const [tflDBack,   setTflDBack]     = useState(driver?.tfl_driver_photo_back ?? '')
  // TFL Vehicle
  const [tflVNumber, setTflVNumber]   = useState(driver?.tfl_vehicle_number ?? '')
  const [tflVExpiry, setTflVExpiry]   = useState(driver?.tfl_vehicle_expiry ?? '')
  const [tflVFront,  setTflVFront]    = useState(driver?.tfl_vehicle_photo_front ?? '')
  const [tflVBack,   setTflVBack]     = useState(driver?.tfl_vehicle_photo_back ?? '')
  // Hertsmere
  const [hertNumber, setHertNumber]   = useState(driver?.hertsmere_number ?? '')
  const [hertExpiry, setHertExpiry]   = useState(driver?.hertsmere_expiry ?? '')
  const [hertFront,  setHertFront]    = useState(driver?.hertsmere_photo_front ?? '')
  const [hertBack,   setHertBack]     = useState(driver?.hertsmere_photo_back ?? '')
  // MOT + vehicle
  const [motExpiry,          setMotExpiry]          = useState(driver?.mot_expiry ?? '')
  const [vehiclePhotoOutside, setVehiclePhotoOutside] = useState(driver?.vehicle_photo_outside ?? '')
  const [vehiclePhotoInside,  setVehiclePhotoInside]  = useState(driver?.vehicle_photo_inside ?? '')

  const profilePhotoRef = useRef<HTMLInputElement>(null)
  const vOutRef = useRef<HTMLInputElement>(null)
  const vInRef  = useRef<HTMLInputElement>(null)
  const refs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    dvlaFront:   useRef(null), dvlaBack:   useRef(null),
    tflDFront:   useRef(null), tflDBack:   useRef(null),
    tflVFront:   useRef(null), tflVBack:   useRef(null),
    hertFront:   useRef(null), hertBack:   useRef(null),
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fullPath = `${path}/${Date.now()}-${safeName}`
    const { data, error } = await supabase.storage.from('vehicles').upload(fullPath, file, { upsert: true })
    if (error || !data) return null
    return supabase.storage.from('vehicles').getPublicUrl(fullPath).data.publicUrl
  }

  async function handleProfilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading('profile')
    const supabase = createClient()
    const path = `driver-photos/${userId}/${Date.now()}-${file.name}`
    const { data } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (data) {
      const { data: url } = supabase.storage.from('avatars').getPublicUrl(path)
      setPhotoUrl(url.publicUrl)
    }
    setUploading(null)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, key: string, setter: (v: string) => void, path: string) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(key)
    const url = await uploadFile(file, path)
    if (url) setter(url)
    setUploading(null)
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
        photo_url: photoUrl || null,
        // Vehicle
        vehicle_photo_outside: vehiclePhotoOutside || null,
        vehicle_photo_inside:  vehiclePhotoInside  || null,
        mot_expiry: motExpiry || null,
        // DVLA
        licence_number:   dvlaNumber || null,
        licence_expiry:   dvlaExpiry || null,
        dvla_photo_front: dvlaFront  || null,
        dvla_photo_back:  dvlaBack   || null,
        // TFL Driver
        tfl_licence_number:     tflDNumber || null,
        tfl_licence_expiry:     tflDExpiry || null,
        tfl_driver_photo_front: tflDFront  || null,
        tfl_driver_photo_back:  tflDBack   || null,
        // TFL Vehicle
        tfl_vehicle_number:      tflVNumber || null,
        tfl_vehicle_expiry:      tflVExpiry || null,
        tfl_vehicle_photo_front: tflVFront  || null,
        tfl_vehicle_photo_back:  tflVBack   || null,
        // Hertsmere
        hertsmere_number:      hertNumber || null,
        hertsmere_expiry:      hertExpiry || null,
        hertsmere_photo_front: hertFront  || null,
        hertsmere_photo_back:  hertBack   || null,
      }).eq('id', userId),
    ])
    if (e1 || e2) setError(e1?.message ?? e2?.message ?? 'Failed to save')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const rating = driver?.rating ?? 0

  // Expiry checks
  const dDvla    = daysUntil(dvlaExpiry)
  const dTflD    = daysUntil(tflDExpiry)
  const dTflV    = daysUntil(tflVExpiry)
  const dHert    = daysUntil(hertExpiry)
  const dMot     = daysUntil(motExpiry)
  const anyAlert = [dDvla, dTflD, dTflV, dHert, dMot].some(d => d !== null && d <= 60)

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your details, licences, and vehicle info</p>
      </div>

      {/* Expiry alerts */}
      {anyAlert && (
        <div className="space-y-2">
          <ExpiryAlert label="DVLA Licence" days={dDvla} />
          <ExpiryAlert label="TfL Driver Licence" days={dTflD} />
          <ExpiryAlert label="TfL Vehicle Licence" days={dTflV} />
          <ExpiryAlert label="Hertsmere Licence" days={dHert} />
          <ExpiryAlert label="MOT" days={dMot} />
        </div>
      )}

      {/* Profile header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
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
              <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
            </label>
            {uploading === 'profile' && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"><span className="text-xs text-white">…</span></div>}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{fullName || 'Your Name'}</h2>
            <p className="text-sm text-white/60">{profile?.email}</p>
            {phone && <p className="text-sm text-white/50 mt-0.5">{phone}</p>}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 fill-white/20'}`} />
                ))}
                <span className="text-xs text-white/60 ml-1">{rating > 0 ? `${rating.toFixed(1)} (${driver?.rating_count})` : 'No ratings'}</span>
              </div>
              {driver?.is_verified && (
                <span className="flex items-center gap-1 text-xs text-blue-400"><Shield className="w-3 h-3" /> Verified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* ── Personal details ── */}
      <Section title="Personal Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name">
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your full name" />
          </Field>
          <Field label={<span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /> Phone</span>}>
            <PhoneVerification
              defaultPhone={phone}
              alreadyVerified={!!(driver as any)?.phone_verified && !!phone}
              onVerified={(verifiedPhone) => setPhone(verifiedPhone)}
            />
          </Field>
        </div>
        <Field label="Email">
          <input value={profile?.email ?? ''} disabled className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
        </Field>
        <Field label="Vehicle Type">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CAR_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setCarType(t)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  carType === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                <Car className="w-3.5 h-3.5 flex-shrink-0" />{carTypeLabel(t)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* ── Vehicle photos ── */}
      <Section title="Vehicle Photos" icon={<Car className="w-4 h-4" />}>
        <div className="grid grid-cols-2 gap-4">
          <VehiclePhotoField
            label="Outside" url={vehiclePhotoOutside}
            uploading={uploading === 'vOut'}
            onUpload={() => vOutRef.current?.click()}
            onClear={() => setVehiclePhotoOutside('')}
          />
          <input ref={vOutRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFileUpload(e, 'vOut', setVehiclePhotoOutside, `driver-vehicles/${userId}/outside`)} />

          <VehiclePhotoField
            label="Inside" url={vehiclePhotoInside}
            uploading={uploading === 'vIn'}
            onUpload={() => vInRef.current?.click()}
            onClear={() => setVehiclePhotoInside('')}
          />
          <input ref={vInRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFileUpload(e, 'vIn', setVehiclePhotoInside, `driver-vehicles/${userId}/inside`)} />
        </div>

        <Field label={<span className="flex items-center gap-1.5"><Wrench className="w-3 h-3" /> MOT Expiry</span>}>
          <div className="flex items-center gap-3">
            <input type="date" value={motExpiry} onChange={e => setMotExpiry(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <ExpiryBadge days={dMot} />
          </div>
        </Field>
      </Section>

      {/* ── Licences ── */}
      <Section title="Licences & Documents" icon={<FileText className="w-4 h-4" />}>
        <LicenceBlock
          title="DVLA Driving Licence" icon="🪪"
          number={dvlaNumber} onNumber={setDvlaNumber}
          expiry={dvlaExpiry} onExpiry={setDvlaExpiry}
          expiryDays={dDvla}
          front={dvlaFront}   onFrontClear={() => setDvlaFront('')}
          back={dvlaBack}     onBackClear={() => setDvlaBack('')}
          onFrontUpload={() => refs.dvlaFront.current?.click()}
          onBackUpload={() => refs.dvlaBack.current?.click()}
          frontUploading={uploading === 'dvlaFront'}
          backUploading={uploading === 'dvlaBack'}
          numberPlaceholder="e.g. SMITH901234AB9CD"
        />
        <input ref={refs.dvlaFront} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'dvlaFront', setDvlaFront, `licences/${userId}/dvla/front`)} />
        <input ref={refs.dvlaBack} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'dvlaBack', setDvlaBack, `licences/${userId}/dvla/back`)} />

        <LicenceBlock
          title="TfL Driver Licence" icon="🚖" badge="TfL"
          number={tflDNumber} onNumber={setTflDNumber}
          expiry={tflDExpiry} onExpiry={setTflDExpiry}
          expiryDays={dTflD}
          front={tflDFront}   onFrontClear={() => setTflDFront('')}
          back={tflDBack}     onBackClear={() => setTflDBack('')}
          onFrontUpload={() => refs.tflDFront.current?.click()}
          onBackUpload={() => refs.tflDBack.current?.click()}
          frontUploading={uploading === 'tflDFront'}
          backUploading={uploading === 'tflDBack'}
          numberPlaceholder="e.g. PHV/12345/2"
        />
        <input ref={refs.tflDFront} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'tflDFront', setTflDFront, `licences/${userId}/tfl-driver/front`)} />
        <input ref={refs.tflDBack} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'tflDBack', setTflDBack, `licences/${userId}/tfl-driver/back`)} />

        <LicenceBlock
          title="TfL Vehicle Licence" icon="🚗" badge="TfL"
          number={tflVNumber} onNumber={setTflVNumber}
          expiry={tflVExpiry} onExpiry={setTflVExpiry}
          expiryDays={dTflV}
          front={tflVFront}   onFrontClear={() => setTflVFront('')}
          back={tflVBack}     onBackClear={() => setTflVBack('')}
          onFrontUpload={() => refs.tflVFront.current?.click()}
          onBackUpload={() => refs.tflVBack.current?.click()}
          frontUploading={uploading === 'tflVFront'}
          backUploading={uploading === 'tflVBack'}
          numberPlaceholder="e.g. PH/1234567"
        />
        <input ref={refs.tflVFront} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'tflVFront', setTflVFront, `licences/${userId}/tfl-vehicle/front`)} />
        <input ref={refs.tflVBack} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'tflVBack', setTflVBack, `licences/${userId}/tfl-vehicle/back`)} />

        <LicenceBlock
          title="Hertsmere Licence" icon="🔑" badge="HBC"
          number={hertNumber} onNumber={setHertNumber}
          expiry={hertExpiry} onExpiry={setHertExpiry}
          expiryDays={dHert}
          front={hertFront}   onFrontClear={() => setHertFront('')}
          back={hertBack}     onBackClear={() => setHertBack('')}
          onFrontUpload={() => refs.hertFront.current?.click()}
          onBackUpload={() => refs.hertBack.current?.click()}
          frontUploading={uploading === 'hertFront'}
          backUploading={uploading === 'hertBack'}
          numberPlaceholder="e.g. HBC-12345"
        />
        <input ref={refs.hertFront} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'hertFront', setHertFront, `licences/${userId}/hertsmere/front`)} />
        <input ref={refs.hertBack} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={e => handleFileUpload(e, 'hertBack', setHertBack, `licences/${userId}/hertsmere/back`)} />
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors
          ${saved ? 'bg-green-600 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'} disabled:opacity-50`}>
        {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
         saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
      </button>
    </div>
  )
}

/* ── Reusable layout components ─────────────────────────────────────────── */
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        {icon}<span>{title}</span>
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function VehiclePhotoField({ label, url, uploading, onUpload, onClear }: {
  label: string; url: string; uploading: boolean; onUpload: () => void; onClear: () => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-1.5">{label}</p>
      {url ? (
        <div className="relative">
          <img src={url} alt={label} className="w-full h-28 object-cover rounded-lg border border-gray-200" />
          <button type="button" onClick={onClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={onUpload} disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors">
          {uploading ? <span className="text-xs text-gray-400">Uploading…</span> : <><Upload className="w-5 h-5 text-gray-300" /><span className="text-xs text-gray-400">Upload {label}</span></>}
        </button>
      )}
    </div>
  )
}

function LicenceBlock({ title, icon, badge, number, onNumber, expiry, onExpiry, expiryDays,
  front, onFrontClear, back, onBackClear, onFrontUpload, onBackUpload, frontUploading, backUploading, numberPlaceholder }: {
  title: string; icon: string; badge?: string
  number: string; onNumber: (v: string) => void
  expiry: string; onExpiry: (v: string) => void
  expiryDays: number | null
  front: string; onFrontClear: () => void
  back: string; onBackClear: () => void
  onFrontUpload: () => void; onBackUpload: () => void
  frontUploading: boolean; backUploading: boolean
  numberPlaceholder: string
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{badge}</span>}
        <ExpiryBadge days={expiryDays} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Licence Number</label>
          <input value={number} onChange={e => onNumber(e.target.value)} placeholder={numberPlaceholder}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Expiry</label>
          <input type="date" value={expiry} onChange={e => onExpiry(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LicencePhotoSlot label="Front" url={front} uploading={frontUploading} onUpload={onFrontUpload} onClear={onFrontClear} />
        <LicencePhotoSlot label="Back"  url={back}  uploading={backUploading}  onUpload={onBackUpload}  onClear={onBackClear} />
      </div>
    </div>
  )
}

function LicencePhotoSlot({ label, url, uploading, onUpload, onClear }: {
  label: string; url: string; uploading: boolean; onUpload: () => void; onClear: () => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      {url ? (
        <div className="relative">
          <img src={url} alt={label} className="w-full h-20 object-cover rounded-lg border border-gray-200" />
          <button type="button" onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={onUpload} disabled={uploading}
          className="w-full h-20 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-300 hover:bg-blue-50 transition-colors">
          {uploading ? <span className="text-[10px] text-gray-400">…</span> : <><FileText className="w-4 h-4 text-gray-300" /><span className="text-[10px] text-gray-400">Upload</span></>}
        </button>
      )}
    </div>
  )
}
