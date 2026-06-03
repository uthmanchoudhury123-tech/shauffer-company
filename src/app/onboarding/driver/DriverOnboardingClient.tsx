'use client'

import { useState, useRef } from 'react'
import { Camera, Car, FileText, User, Phone, CheckCircle2, ChevronRight, ArrowLeft, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CAR_TYPES = ['saloon', 'estate', 'suv', 'mpv', 'minibus', 'executive', 'van']
const CAR_LABELS: Record<string, string> = {
  saloon: 'Saloon', estate: 'Estate', suv: 'SUV', mpv: 'MPV',
  minibus: 'Minibus', executive: 'Executive', van: 'Van',
}

const STEPS = ['Your Details', 'Vehicle', 'Licences']

interface LicenceState {
  number: string
  expiry: string
  photoFront: string
  photoBack: string
}

const emptyLicence: LicenceState = { number: '', expiry: '', photoFront: '', photoBack: '' }

export function DriverOnboardingClient({
  userId, defaultName, email, role,
}: {
  userId: string
  defaultName: string
  email: string
  role: string
}) {
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Step 0 — details
  const [fullName, setFullName]       = useState(defaultName)
  const [phone, setPhone]             = useState('')
  const [photoUrl, setPhotoUrl]       = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const profilePhotoRef = useRef<HTMLInputElement>(null)

  // Step 1 — vehicle (inside + outside mandatory)
  const [vehiclePhotoOutside, setVehiclePhotoOutside] = useState('')
  const [vehiclePhotoInside,  setVehiclePhotoInside]  = useState('')
  const [uploadingVehicle, setUploadingVehicle] = useState<'outside'|'inside'|null>(null)
  const vehicleOutsideRef = useRef<HTMLInputElement>(null)
  const vehicleInsideRef  = useRef<HTMLInputElement>(null)
  const [carType, setCarType] = useState('saloon')

  // Step 2 — licences
  const [dvla,           setDvla]           = useState<LicenceState>(emptyLicence)
  const [tflDriver,      setTflDriver]      = useState<LicenceState>(emptyLicence)
  const [tflVehicle,     setTflVehicle]     = useState<LicenceState>(emptyLicence)
  const [hertsmere,      setHertsmere]      = useState<LicenceState>(emptyLicence)
  const [uploadingLicence, setUploadingLicence] = useState<string | null>(null)

  const dvlaFrontRef        = useRef<HTMLInputElement>(null)
  const dvlaBackRef         = useRef<HTMLInputElement>(null)
  const tflDriverFrontRef   = useRef<HTMLInputElement>(null)
  const tflDriverBackRef    = useRef<HTMLInputElement>(null)
  const tflVehicleFrontRef  = useRef<HTMLInputElement>(null)
  const tflVehicleBackRef   = useRef<HTMLInputElement>(null)
  const hertFrontRef        = useRef<HTMLInputElement>(null)
  const hertBackRef         = useRef<HTMLInputElement>(null)

  async function uploadToStorage(file: File, path: string): Promise<string | null> {
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fullPath = `${path}/${Date.now()}-${safeName}`
    const { data, error } = await supabase.storage
      .from('vehicles')
      .upload(fullPath, file, { upsert: true, contentType: file.type })
    if (error || !data) return null
    const { data: url } = supabase.storage.from('vehicles').getPublicUrl(fullPath)
    return url.publicUrl
  }

  async function handleProfilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingPhoto(true)
    const url = await uploadToStorage(file, `driver-photos/${userId}`)
    if (url) setPhotoUrl(url)
    setUploadingPhoto(false)
  }

  async function handleVehiclePhoto(e: React.ChangeEvent<HTMLInputElement>, side: 'outside'|'inside') {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingVehicle(side)
    const url = await uploadToStorage(file, `driver-vehicles/${userId}/${side}`)
    if (url) {
      if (side === 'outside') setVehiclePhotoOutside(url)
      else setVehiclePhotoInside(url)
    }
    setUploadingVehicle(null)
  }

  async function handleLicencePhoto(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    side: 'front'|'back',
    setter: React.Dispatch<React.SetStateAction<LicenceState>>
  ) {
    const file = e.target.files?.[0]; if (!file) return
    const uploadKey = `${key}-${side}`
    setUploadingLicence(uploadKey)
    const url = await uploadToStorage(file, `licences/${userId}/${key}/${side}`)
    if (url) setter(prev => side === 'front' ? { ...prev, photoFront: url } : { ...prev, photoBack: url })
    setUploadingLicence(null)
  }

  function canProceed() {
    if (step === 0) return fullName.trim().length > 0
    if (step === 1) return vehiclePhotoOutside !== '' && vehiclePhotoInside !== ''
    return true
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/driver/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:    fullName,
          phone,
          car_type:     carType,
          photo_url:    photoUrl || null,
          // Vehicle
          vehicle_photo_outside: vehiclePhotoOutside || null,
          vehicle_photo_inside:  vehiclePhotoInside  || null,
          // DVLA
          licence_number:    dvla.number  || null,
          licence_expiry:    dvla.expiry  || null,
          dvla_photo_front:  dvla.photoFront || null,
          dvla_photo_back:   dvla.photoBack  || null,
          // TFL Driver
          tfl_licence_number:      tflDriver.number     || null,
          tfl_licence_expiry:      tflDriver.expiry     || null,
          tfl_driver_photo_front:  tflDriver.photoFront || null,
          tfl_driver_photo_back:   tflDriver.photoBack  || null,
          // TFL Vehicle
          tfl_vehicle_number:       tflVehicle.number     || null,
          tfl_vehicle_expiry:       tflVehicle.expiry     || null,
          tfl_vehicle_photo_front:  tflVehicle.photoFront || null,
          tfl_vehicle_photo_back:   tflVehicle.photoBack  || null,
          // Hertsmere
          hertsmere_number:       hertsmere.number     || null,
          hertsmere_expiry:       hertsmere.expiry     || null,
          hertsmere_photo_front:  hertsmere.photoFront || null,
          hertsmere_photo_back:   hertsmere.photoBack  || null,
        }),
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /**/ }
      if (!res.ok) { setError(data.error ?? `Server error (${res.status})`); setSaving(false); return }
      window.location.href = '/dashboard/driver'
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
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
          <p className="text-gray-500 text-sm mt-1">Takes about 3 minutes</p>
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
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          {/* ── Step 0: Details ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" />
                    : <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300"><User className="w-8 h-8 text-gray-300" /></div>
                  }
                  <button type="button" onClick={() => profilePhotoRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} disabled={uploadingPhoto} />
                  {uploadingPhoto && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"><span className="text-xs text-white">…</span></div>}
                </div>
                <p className="text-xs text-gray-400">Profile photo <span className="text-gray-300">(optional)</span></p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full legal name"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input value={email} disabled className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
            </div>
          )}

          {/* ── Step 1: Vehicle ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CAR_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setCarType(t)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        carType === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <Car className="w-3.5 h-3.5 flex-shrink-0" />{CAR_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outside photo — mandatory */}
              <VehiclePhotoSlot
                label="Outside photo"
                required
                hint="Clear exterior shot"
                url={vehiclePhotoOutside}
                uploading={uploadingVehicle === 'outside'}
                onUpload={() => vehicleOutsideRef.current?.click()}
                onClear={() => setVehiclePhotoOutside('')}
              />
              <input ref={vehicleOutsideRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleVehiclePhoto(e, 'outside')} disabled={uploadingVehicle !== null} />

              {/* Inside photo — mandatory */}
              <VehiclePhotoSlot
                label="Inside photo"
                required
                hint="Dashboard + interior"
                url={vehiclePhotoInside}
                uploading={uploadingVehicle === 'inside'}
                onUpload={() => vehicleInsideRef.current?.click()}
                onClear={() => setVehiclePhotoInside('')}
              />
              <input ref={vehicleInsideRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleVehiclePhoto(e, 'inside')} disabled={uploadingVehicle !== null} />

              {(!vehiclePhotoOutside || !vehiclePhotoInside) && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Both vehicle photos are required before you can continue.
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Licences ── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-xs text-gray-500">Upload front and back of each licence. All fields optional — add now or update from profile later.</p>

              <LicenceSection
                title="DVLA Driving Licence"
                icon="🪪"
                state={dvla}
                onChange={setDvla}
                uploadKey="dvla"
                frontRef={dvlaFrontRef}
                backRef={dvlaBackRef}
                uploading={uploadingLicence}
                onFrontFile={e => handleLicencePhoto(e, 'dvla', 'front', setDvla)}
                onBackFile={e => handleLicencePhoto(e, 'dvla', 'back', setDvla)}
                numberPlaceholder="e.g. SMITH901234AB9CD"
              />

              <LicenceSection
                title="TfL Driver Licence"
                icon="🚖"
                badge="TfL"
                state={tflDriver}
                onChange={setTflDriver}
                uploadKey="tfl-driver"
                frontRef={tflDriverFrontRef}
                backRef={tflDriverBackRef}
                uploading={uploadingLicence}
                onFrontFile={e => handleLicencePhoto(e, 'tfl-driver', 'front', setTflDriver)}
                onBackFile={e => handleLicencePhoto(e, 'tfl-driver', 'back', setTflDriver)}
                numberPlaceholder="e.g. PHV/12345/2"
              />

              <LicenceSection
                title="TfL Vehicle Licence"
                icon="🚗"
                badge="TfL"
                state={tflVehicle}
                onChange={setTflVehicle}
                uploadKey="tfl-vehicle"
                frontRef={tflVehicleFrontRef}
                backRef={tflVehicleBackRef}
                uploading={uploadingLicence}
                onFrontFile={e => handleLicencePhoto(e, 'tfl-vehicle', 'front', setTflVehicle)}
                onBackFile={e => handleLicencePhoto(e, 'tfl-vehicle', 'back', setTflVehicle)}
                numberPlaceholder="e.g. PH/1234567"
              />

              <LicenceSection
                title="Hertsmere Licence"
                icon="🔑"
                badge="HBC"
                state={hertsmere}
                onChange={setHertsmere}
                uploadKey="hertsmere"
                frontRef={hertFrontRef}
                backRef={hertBackRef}
                uploading={uploadingLicence}
                onFrontFile={e => handleLicencePhoto(e, 'hertsmere', 'front', setHertsmere)}
                onBackFile={e => handleLicencePhoto(e, 'hertsmere', 'back', setHertsmere)}
                numberPlaceholder="e.g. HBC-12345"
              />

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</p>
                <SummaryRow label="Name" value={fullName} />
                {phone && <SummaryRow label="Phone" value={phone} />}
                <SummaryRow label="Vehicle" value={CAR_LABELS[carType]} />
                <SummaryRow label="Photos" value={`Outside ✓  Inside ✓`} />
                {dvla.number && <SummaryRow label="DVLA" value={dvla.number} />}
                {tflDriver.number && <SummaryRow label="TfL Driver" value={tflDriver.number} />}
                {tflVehicle.number && <SummaryRow label="TfL Vehicle" value={tflVehicle.number} />}
                {hertsmere.number && <SummaryRow label="Hertsmere" value={hertsmere.number} />}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
            {step > 0
              ? <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"><ArrowLeft className="w-4 h-4" /> Back</button>
              : <div />
            }
            {step < STEPS.length - 1
              ? <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              : <button onClick={handleFinish} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : <><CheckCircle2 className="w-4 h-4" /> Go to Dashboard</>}
                </button>
            }
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can update all of this from <strong>My Profile</strong> in your dashboard
        </p>
      </div>
    </div>
  )
}

/* ── Vehicle photo slot ─────────────────────────────────────────────────── */
function VehiclePhotoSlot({ label, required, hint, url, uploading, onUpload, onClear }: {
  label: string; required?: boolean; hint: string
  url: string; uploading: boolean
  onUpload: () => void; onClear: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          {required && <span className="ml-1 text-red-500 text-xs">*</span>}
          <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
        </div>
        {url && (
          <button type="button" onClick={onClear} className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-red-500" />
          </button>
        )}
      </div>
      {url ? (
        <img src={url} alt={label} className="w-full h-32 object-cover rounded-lg border border-gray-200" />
      ) : (
        <button type="button" onClick={onUpload} disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
          {uploading
            ? <span className="text-xs text-gray-400">Uploading…</span>
            : <><Upload className="w-5 h-5 text-gray-300" /><span className="text-xs text-gray-400">Tap to upload</span></>
          }
        </button>
      )}
    </div>
  )
}

/* ── Licence section ────────────────────────────────────────────────────── */
function LicenceSection({ title, icon, badge, state, onChange, uploadKey, frontRef, backRef, uploading, onFrontFile, onBackFile, numberPlaceholder }: {
  title: string; icon: string; badge?: string
  state: LicenceState
  onChange: (s: LicenceState) => void
  uploadKey: string
  frontRef: React.RefObject<HTMLInputElement | null>
  backRef: React.RefObject<HTMLInputElement | null>
  uploading: string | null
  onFrontFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBackFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  numberPlaceholder: string
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{badge}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Licence Number</label>
          <input value={state.number} onChange={e => onChange({ ...state, number: e.target.value })}
            placeholder={numberPlaceholder}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
          <input type="date" value={state.expiry} onChange={e => onChange({ ...state, expiry: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Front + Back photos */}
      <div className="grid grid-cols-2 gap-3">
        <PhotoSlot
          label="Front"
          url={state.photoFront}
          uploading={uploading === `${uploadKey}-front`}
          onUpload={() => frontRef.current?.click()}
          onClear={() => onChange({ ...state, photoFront: '' })}
        />
        <input ref={frontRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFrontFile} />

        <PhotoSlot
          label="Back"
          url={state.photoBack}
          uploading={uploading === `${uploadKey}-back`}
          onUpload={() => backRef.current?.click()}
          onClear={() => onChange({ ...state, photoBack: '' })}
        />
        <input ref={backRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onBackFile} />
      </div>
    </div>
  )
}

function PhotoSlot({ label, url, uploading, onUpload, onClear }: {
  label: string; url: string; uploading: boolean
  onUpload: () => void; onClear: () => void
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
          className="w-full h-20 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
          {uploading
            ? <span className="text-[10px] text-gray-400">…</span>
            : <><FileText className="w-4 h-4 text-gray-300" /><span className="text-[10px] text-gray-400">Upload</span></>
          }
        </button>
      )}
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
