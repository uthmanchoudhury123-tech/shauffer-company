'use client'

import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { driverStatusColor, carTypeLabel } from '@/lib/utils'
import { Map, Users } from 'lucide-react'

interface DriverMapData {
  id: string
  full_name: string
  availability_status: string
  current_lat?: number | null
  current_lng?: number | null
  car_type: string
  location_updated_at?: string | null
}

const STATUS_COLOURS: Record<string, string> = {
  available: '#16a34a',
  on_job:    '#2563eb',
  offline:   '#6b7280',
}

interface MapClientProps {
  drivers: DriverMapData[]
  mapboxToken: string
}

function createMarkerEl(driver: DriverMapData, onClick: () => void) {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${STATUS_COLOURS[driver.availability_status] ?? '#6b7280'};
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    font-family: sans-serif;
  `
  el.textContent = driver.full_name.charAt(0).toUpperCase()
  el.title = driver.full_name
  el.addEventListener('click', onClick)
  return el
}

export function MapClient({ drivers: initialDrivers, mapboxToken }: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersMapRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [drivers, setDrivers] = useState<DriverMapData[]>(initialDrivers)
  const [selected, setSelected] = useState<DriverMapData | null>(null)

  const locatedDrivers = drivers.filter(d => d.current_lat && d.current_lng)
  const unlocatedDrivers = drivers.filter(d => !d.current_lat || !d.current_lng)

  // 1. Initialise map
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
      markersMapRef.current.forEach(m => m.remove())
      markersMapRef.current.clear()
      map.remove()
    }
  }, [mapboxToken])

  // 2. Sync markers whenever drivers state changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const located = drivers.filter(d => d.current_lat && d.current_lng)

    // Add or update markers
    located.forEach(driver => {
      const existing = markersMapRef.current.get(driver.id)
      if (existing) {
        existing.setLngLat([driver.current_lng!, driver.current_lat!])
      } else {
        const el = createMarkerEl(driver, () => setSelected(driver))
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.current_lng!, driver.current_lat!])
          .addTo(map)
        markersMapRef.current.set(driver.id, marker)
      }
    })

    // Remove markers for drivers who stopped sharing
    markersMapRef.current.forEach((marker, id) => {
      if (!located.find(d => d.id === id)) {
        marker.remove()
        markersMapRef.current.delete(id)
      }
    })

    // Fit bounds on first load if there are located drivers and no markers existed yet
    if (located.length > 0 && markersMapRef.current.size === located.length) {
      const bounds = new mapboxgl.LngLatBounds()
      located.forEach(d => bounds.extend([d.current_lng!, d.current_lat!]))
      map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
    }
  }, [drivers])

  // 3. Supabase Realtime — live driver location updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('drivers-location-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        (payload) => {
          const updated = payload.new as DriverMapData
          setDrivers(prev =>
            prev.map(d =>
              d.id === updated.id
                ? {
                    ...d,
                    current_lat: updated.current_lat,
                    current_lng: updated.current_lng,
                    availability_status: updated.availability_status,
                    location_updated_at: updated.location_updated_at,
                  }
                : d
            )
          )
          // Keep selected panel in sync
          setSelected(prev =>
            prev?.id === updated.id ? { ...prev, ...updated } : prev
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!mapboxToken) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <Map className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h2 className="font-semibold text-yellow-800">Mapbox Token Required</h2>
          <p className="text-sm text-yellow-700 mt-1">
            Add <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to your{' '}
            <code className="bg-yellow-100 px-1 rounded">.env.local</code> file to enable the map view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Map */}
      <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Live indicator */}
        <div className="absolute top-4 left-4 bg-gray-950/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live
        </div>

        {/* Selected driver popup */}
        {selected && (
          <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-48 z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{selected.full_name}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            </div>
            <Badge className={driverStatusColor(selected.availability_status)}>
              {selected.availability_status.replace('_', ' ')}
            </Badge>
            <p className="text-xs text-gray-400 mt-1.5">{carTypeLabel(selected.car_type)}</p>
            {selected.location_updated_at && (
              <p className="text-xs text-gray-300 mt-1">
                Updated {new Date(selected.location_updated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Driver List Sidebar */}
      <div className="w-full lg:w-64 h-48 lg:h-auto bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" /> Drivers ({drivers.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {drivers.length === 0 && (
            <p className="text-xs text-gray-400 p-4 text-center">No drivers yet</p>
          )}

          {locatedDrivers.map(d => (
            <button
              key={d.id}
              onClick={() => {
                setSelected(d)
                if (mapRef.current && d.current_lat && d.current_lng) {
                  mapRef.current.flyTo({
                    center: [d.current_lng, d.current_lat],
                    zoom: 14,
                    duration: 1000,
                  })
                }
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLOURS[d.availability_status] ?? '#6b7280' }}
                />
                <span className="text-sm font-medium text-gray-800 truncate">{d.full_name}</span>
              </div>
              <div className="ml-4 mt-0.5">
                <Badge className={`text-xs ${driverStatusColor(d.availability_status)}`}>
                  {d.availability_status.replace('_', ' ')}
                </Badge>
              </div>
            </button>
          ))}

          {unlocatedDrivers.map(d => (
            <div key={d.id} className="px-4 py-3 opacity-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-500 truncate">{d.full_name}</span>
              </div>
              <p className="ml-4 text-xs text-gray-400 mt-0.5">No location data</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
