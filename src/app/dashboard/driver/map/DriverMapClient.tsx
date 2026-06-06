'use client'

import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createClient } from '@/lib/supabase/client'
import { Map, Navigation, Clock } from 'lucide-react'

interface DriverMapData {
  id: string
  full_name: string
  availability_status: string
  current_lat?: number | null
  current_lng?: number | null
  car_type: string
  location_updated_at?: string | null
}

interface PostedJob {
  id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  status: string
}

interface Props {
  drivers: DriverMapData[]
  postedJobs: PostedJob[]
  currentDriverId: string
  mapboxToken: string
}

const STATUS_COLOURS: Record<string, string> = {
  available: '#16a34a',
  on_job:    '#2563eb',
  offline:   '#6b7280',
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  on_job:    'On Job',
  offline:   'Offline',
}

function createMarkerEl(driver: DriverMapData, isTracked: boolean, onClick: () => void) {
  const el = document.createElement('div')
  const bg = STATUS_COLOURS[driver.availability_status] ?? '#6b7280'
  el.style.cssText = `
    width: ${isTracked ? 42 : 34}px;
    height: ${isTracked ? 42 : 34}px;
    border-radius: 50%;
    background: ${bg};
    border: ${isTracked ? '3px solid #fff' : '2px solid rgba(255,255,255,0.5)'};
    box-shadow: ${isTracked ? '0 0 0 3px ' + bg + '40, 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)'};
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: ${isTracked ? 14 : 12}px;
    cursor: pointer;
    font-family: sans-serif;
    transition: transform 0.2s;
  `
  el.textContent = driver.full_name.charAt(0).toUpperCase()
  el.title = driver.full_name
  el.addEventListener('click', onClick)
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)' })
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
  return el
}

export function DriverMapClient({ drivers: initialDrivers, postedJobs, currentDriverId, mapboxToken }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({})
  const [drivers, setDrivers] = useState<DriverMapData[]>(initialDrivers)
  const [selected, setSelected] = useState<DriverMapData | null>(null)

  // IDs of drivers assigned to this driver's posted jobs (priority tracking)
  const trackedIds = new Set(postedJobs.map(j => j.driver_id).filter(Boolean) as string[])

  const locatedDrivers = drivers.filter(d => d.current_lat && d.current_lng)
  const offlineDrivers  = drivers.filter(d => !d.current_lat || !d.current_lng)

  // ── 1. Init map ───────────────────────────────────────────
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return
    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-0.1276, 51.5074],
      zoom: 10,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => {
      Object.values(markersRef.current).forEach(m => m.remove())
      markersRef.current = {}
      map.remove()
    }
  }, [mapboxToken])

  // ── 2. Sync markers ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const located = drivers.filter(d => d.current_lat && d.current_lng)

    located.forEach(driver => {
      const isTracked = trackedIds.has(driver.id)
      const existing = markersRef.current[driver.id]
      if (existing) {
        existing.setLngLat([driver.current_lng!, driver.current_lat!])
      } else {
        const el = createMarkerEl(driver, isTracked, () => setSelected(driver))
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.current_lng!, driver.current_lat!])
          .addTo(map)
        markersRef.current[driver.id] = marker
      }
    })

    // Remove markers for drivers who stopped sharing
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!located.find(d => d.id === id)) {
        marker.remove()
        delete markersRef.current[id]
      }
    })

    // Fit bounds on first load
    if (located.length > 0 && Object.keys(markersRef.current).length === located.length) {
      if (located.length === 1) {
        map.flyTo({ center: [located[0].current_lng!, located[0].current_lat!], zoom: 13 })
      } else {
        const bounds = new mapboxgl.LngLatBounds()
        located.forEach(d => bounds.extend([d.current_lng!, d.current_lat!]))
        map.fitBounds(bounds, { padding: 100, maxZoom: 14 })
      }
    }
  }, [drivers])

  // ── 3. Supabase Realtime ──────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('driver-map-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        (payload) => {
          const updated = payload.new as DriverMapData
          setDrivers(prev =>
            prev.map(d =>
              d.id === updated.id
                ? { ...d, current_lat: updated.current_lat, current_lng: updated.current_lng,
                    availability_status: updated.availability_status,
                    location_updated_at: updated.location_updated_at }
                : d
            )
          )
          setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── No token ──────────────────────────────────────────────
  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center max-w-sm">
          <Map className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <h2 className="font-semibold text-white mb-2">Map Unavailable</h2>
          <p className="text-sm text-gray-400">
            Mapbox token not configured. Contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">

      {/* ── Map ─────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-[55vh] lg:min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Live pill */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-gray-950/80 backdrop-blur-sm border border-white/10 text-white text-xs px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live tracking
        </div>

        {/* Selected driver card */}
        {selected && (
          <div className="absolute bottom-6 left-6 z-10 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-52 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: STATUS_COLOURS[selected.availability_status] ?? '#6b7280' }}
                >
                  {selected.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{selected.full_name}</p>
                  <p className="text-xs text-gray-400">{selected.car_type}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white transition-colors ml-2 text-lg leading-none">
                ×
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLOURS[selected.availability_status] ?? '#6b7280' }}
              />
              <span className="text-xs font-medium text-gray-300">
                {STATUS_LABEL[selected.availability_status] ?? selected.availability_status}
              </span>
            </div>
            {selected.location_updated_at && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  Updated {new Date(selected.location_updated_at).toLocaleTimeString()}
                </span>
              </div>
            )}
            {trackedIds.has(selected.id) && (
              <div className="mt-2 text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full text-center">
                Assigned to your job
              </div>
            )}
            {selected.current_lat && selected.current_lng && (
              <a
                href={`https://www.google.com/maps?q=${selected.current_lat},${selected.current_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 w-full text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg py-1.5 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                Open in Google Maps
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className="w-full lg:w-64 bg-gray-950 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col overflow-hidden">
        <div className="px-4 py-3.5 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Map className="w-4 h-4 text-blue-400" />
            Drivers
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {locatedDrivers.length} sharing location
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {drivers.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No drivers to track yet.</p>
              <p className="text-xs text-gray-600 mt-1">Drivers appear here when they have active jobs.</p>
            </div>
          )}

          {locatedDrivers.map(d => (
            <button
              key={d.id}
              onClick={() => {
                setSelected(d)
                if (mapRef.current && d.current_lat && d.current_lng) {
                  mapRef.current.flyTo({ center: [d.current_lng, d.current_lat], zoom: 14, duration: 800 })
                }
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-900/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: STATUS_COLOURS[d.availability_status] ?? '#6b7280' }}
                >
                  {d.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{d.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {STATUS_LABEL[d.availability_status] ?? d.availability_status}
                    {trackedIds.has(d.id) && <span className="text-blue-400 ml-1">· your job</span>}
                  </p>
                </div>
                {trackedIds.has(d.id) && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}

          {offlineDrivers.map(d => (
            <div key={d.id} className="px-4 py-3 opacity-40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-xs flex-shrink-0">
                  {d.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-400 truncate">{d.full_name}</p>
                  <p className="text-xs text-gray-600">No location</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Posted jobs list */}
        {postedJobs.length > 0 && (
          <div className="border-t border-white/5 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Active Jobs</p>
            <div className="space-y-2">
              {postedJobs.map(job => {
                const assignedDriver = drivers.find(d => d.id === job.driver_id)
                return (
                  <div key={job.id} className="bg-gray-900/60 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-300 truncate font-medium">{job.pickup_address}</p>
                    <p className="text-xs text-gray-500 truncate">→ {job.dropoff_address}</p>
                    {assignedDriver && (
                      <p className="text-xs text-blue-400 mt-1">
                        Driver: {assignedDriver.full_name}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
