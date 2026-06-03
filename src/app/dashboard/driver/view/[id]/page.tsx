import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Star, Shield, Car, MapPin, Phone, Calendar, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { carTypeLabel } from '@/lib/utils'

export default async function DriverPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: profile }, { data: driver }] = await Promise.all([
    supabase.from('user_profiles').select('full_name, email, role').eq('id', id).single(),
    supabase.from('drivers').select('*').eq('id', id).single(),
  ])

  if (!driver) notFound()

  const licences = [
    { label: 'DVLA Driving Licence', number: driver.licence_number, expiry: driver.licence_expiry, icon: '🪪' },
    { label: 'TfL Driver Licence',   number: driver.tfl_licence_number,   expiry: driver.tfl_licence_expiry,   icon: '🚖' },
    { label: 'TfL Vehicle Licence',  number: driver.tfl_vehicle_number,  expiry: driver.tfl_vehicle_expiry,  icon: '🚗' },
    { label: 'Hertsmere Licence',    number: driver.hertsmere_number,    expiry: driver.hertsmere_expiry,    icon: '🔑' },
  ]

  function licenceStatus(expiry: string | null) {
    if (!expiry) return null
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    if (days < 0) return { label: 'Expired', colour: 'red' as const }
    if (days <= 30) return { label: `${days}d left`, colour: 'orange' as const }
    return { label: 'Valid', colour: 'green' as const }
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden bg-blue-600 flex items-center justify-center text-3xl font-bold border-2 border-white/20">
            {driver.photo_url
              ? <img src={driver.photo_url} alt={driver.full_name} className="w-full h-full object-cover" />
              : <span>{(driver.full_name ?? profile?.full_name ?? 'D').charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{driver.full_name ?? profile?.full_name}</h1>
            <p className="text-sm text-white/50 capitalize mt-0.5">{profile?.role?.replace('_', ' ')}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(driver.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 fill-white/20'}`} />
                ))}
                <span className="text-xs text-white/60 ml-1">
                  {(driver.rating ?? 0) > 0 ? `${(driver.rating as number).toFixed(1)} (${driver.rating_count})` : 'No ratings'}
                </span>
              </div>
              {driver.is_verified && (
                <span className="flex items-center gap-1 text-xs text-blue-400"><Shield className="w-3 h-3" /> Verified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Vehicle</p>
          <p className="text-sm font-bold text-gray-800">{carTypeLabel(driver.car_type ?? 'saloon')}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Rating</p>
          <p className="text-sm font-bold text-gray-800">{(driver.rating ?? 0) > 0 ? (driver.rating as number).toFixed(1) : '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <p className="text-sm font-bold text-gray-800 capitalize">{driver.availability_status ?? 'offline'}</p>
        </div>
      </div>

      {/* Vehicle photos */}
      {(driver.vehicle_photo_outside || driver.vehicle_photo_inside) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Car className="w-4 h-4" /> Vehicle
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {driver.vehicle_photo_outside && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Outside</p>
                <img src={driver.vehicle_photo_outside} alt="Outside" className="w-full h-28 object-cover rounded-lg" />
              </div>
            )}
            {driver.vehicle_photo_inside && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Inside</p>
                <img src={driver.vehicle_photo_inside} alt="Inside" className="w-full h-28 object-cover rounded-lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Licences */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4" /> Licences
        </h2>
        <div className="space-y-3">
          {licences.map(lic => {
            const status = licenceStatus(lic.expiry)
            return (
              <div key={lic.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{lic.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{lic.label}</p>
                    {lic.number && <p className="text-xs text-gray-400">{lic.number}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lic.expiry && <p className="text-xs text-gray-400">{new Date(lic.expiry).toLocaleDateString('en-GB')}</p>}
                  {status ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      status.colour === 'green' ? 'bg-green-100 text-green-700' :
                      status.colour === 'orange' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>{status.label}</span>
                  ) : lic.number ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
