'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, X } from 'lucide-react'

interface Suggestion {
  id: string
  place_name: string
  text: string
  lat: number
  lng: number
}

export interface LocationCoords {
  address: string
  lat: number
  lng: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelectCoords?: (coords: LocationCoords) => void
  placeholder?: string
  className?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export function LocationAutocomplete({ value, onChange, onSelectCoords, placeholder = 'Search address...', className = '' }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value → internal query when parent resets the form
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
        + `?access_token=${MAPBOX_TOKEN}`
        + `&autocomplete=true`
        + `&country=gb`
        + `&types=address,place,poi,postcode,locality,neighborhood`
        + `&limit=6`
        + `&language=en`
      const res = await fetch(url)
      const data = await res.json()
      setSuggestions((data.features ?? []).map((f: any) => ({
        id: f.id,
        place_name: f.place_name,
        text: f.text,
        lng: f.geometry?.coordinates?.[0] ?? 0,
        lat: f.geometry?.coordinates?.[1] ?? 0,
      })))
      setOpen(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    onChange(q) // keep parent in sync as user types
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300)
  }

  function handleSelect(suggestion: Suggestion) {
    setQuery(suggestion.place_name)
    onChange(suggestion.place_name)
    if (onSelectCoords) {
      onSelectCoords({ address: suggestion.place_name, lat: suggestion.lat, lng: suggestion.lng })
    }
    setSuggestions([])
    setOpen(false)
  }

  function handleClear() {
    setQuery('')
    onChange('')
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
              Searching…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
          ) : (
            suggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0 transition-colors"
              >
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{s.place_name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
