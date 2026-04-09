'use client'

import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
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

// Mapbox marker colour per driver status
const STATUS_COLOURS: Record<string, string> = {
  available: '#16a34a',   // green
  on_job:    '#2563eb',   // blue
  offline:   '#6b7280',   // gray
}

interface MapClientProps {
  drivers: DriverMapData[]
  mapboxToken: string
}

export function MapClient({ drivers, mapboxToken }: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [selected, setSelected] = useState<DriverMapData | null>(null)

  // Drivers with a known location
  const locatedDrivers = drivers.filter(d => d.current_lat && d.current_lng)
  // Drivers without location (offline / haven't shared)
  const unlocatedDrivers = drivers.filter(d => !d.current_lat || !d.current_lng)

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-0.1276, 51.5074], // London default
      zoom: 10,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    // Add markers for each driver with a location
    locatedDrivers.forEach(driver => {
      if (!driver.current_lat || !driver.current_lng) return

      // Custom marker element
      const el = document.createElement('div')
      el.className = 'driver-marker'
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

      el.addEventListener('click', () => setSelected(driver))

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([driver.current_lng, driver.current_lat])
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Fit map to all driver markers if any exist
    if (locatedDrivers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      locatedDrivers.forEach(d => {
        if (d.current_lat && d.current_lng) {
          bounds.extend([d.current_lng, d.current_lat])
        }
      })
      map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
    }

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken])

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
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="w-full h-full" />

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
      <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" /> Drivers ({drivers.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {drivers.length === 0 && (
            <p className="text-xs text-gray-400 p-4 text-center">No drivers yet</p>
          )}

          {/* Drivers with location */}
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
                {/* Status dot */}
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

          {/* Drivers without location */}
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
