'use client'

import { useState, useRef } from 'react'
import { Printer, RefreshCw, Car, MapPin, Clock } from 'lucide-react'

interface Job {
  id: string
  pickup_address: string
  dropoff_address: string
  job_date: string
  job_time: string
  notes: string | null
  price: number
}

export function SignClient({
  driverName,
  companyName,
  companyLogo,
  job,
}: {
  driverName: string
  companyName: string
  companyLogo: string | null
  job: Job | null
}) {
  const [passengerName, setPassengerName] = useState(
    job?.notes?.match(/passenger[:\s]+([^\n,]+)/i)?.[1]?.trim() ?? ''
  )
  const [flightNumber, setFlightNumber] = useState(
    job?.notes?.match(/flight[:\s]+([^\n,\s]+)/i)?.[1]?.trim() ?? ''
  )
  const [customNote, setCustomNote] = useState('')
  const signRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const printContent = signRef.current?.innerHTML
    if (!printContent) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Meet & Greet Sign</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; background: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .sign { width: 210mm; min-height: 148mm; padding: 40px; border: 3px solid #000; border-radius: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
            .company { font-size: 18px; font-weight: bold; color: #374151; letter-spacing: 2px; text-transform: uppercase; }
            .logo { width: 80px; height: 80px; object-fit: contain; }
            .logo-placeholder { width: 80px; height: 80px; background: #1e3a5f; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .name { font-size: 72px; font-weight: 900; color: #111827; line-height: 1; letter-spacing: -2px; }
            .flight { font-size: 22px; color: #6b7280; font-weight: 600; letter-spacing: 3px; }
            .divider { width: 60%; height: 3px; background: #111827; border-radius: 2px; }
            .pickup { font-size: 16px; color: #4b5563; }
            .time { font-size: 18px; font-weight: 700; color: #1d4ed8; }
            .note { font-size: 14px; color: #9ca3af; font-style: italic; }
            .driver-info { font-size: 14px; color: #6b7280; margin-top: 10px; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  const displayName = passengerName || 'PASSENGER NAME'

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meet &amp; Greet Sign</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate a printable sign for your passenger</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Passenger Name *</label>
            <input
              value={passengerName}
              onChange={e => setPassengerName(e.target.value)}
              placeholder="e.g. Mr John Smith"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Flight Number <span className="text-gray-400">(optional)</span></label>
            <input
              value={flightNumber}
              onChange={e => setFlightNumber(e.target.value)}
              placeholder="e.g. BA2490"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Additional Note <span className="text-gray-400">(optional)</span></label>
          <input
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder="e.g. Welcome back, VIP guest"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sign preview */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4 text-center">Preview</p>
        <div ref={signRef}>
          <div className="sign border-4 border-gray-900 rounded-2xl p-10 text-center flex flex-col items-center gap-5" style={{ minHeight: '300px' }}>
            {/* Company */}
            <div className="flex flex-col items-center gap-2">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="h-14 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
                  <Car className="w-8 h-8 text-white" />
                </div>
              )}
              <p className="text-sm font-bold text-gray-500 tracking-[4px] uppercase">{companyName}</p>
            </div>

            {/* Divider */}
            <div className="w-3/4 h-0.5 bg-gray-900" />

            {/* Passenger name */}
            <div>
              <p className={`font-black text-gray-900 leading-none tracking-tight ${
                displayName.length > 20 ? 'text-4xl' : displayName.length > 14 ? 'text-5xl' : 'text-6xl'
              }`}>
                {displayName}
              </p>
              {flightNumber && (
                <p className="text-lg font-semibold text-gray-400 tracking-widest mt-2 uppercase">{flightNumber}</p>
              )}
            </div>

            {/* Divider */}
            <div className="w-3/4 h-0.5 bg-gray-900" />

            {/* Job details */}
            {job && (
              <div className="flex flex-col items-center gap-1 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold text-gray-700">{job.job_date} · {job.job_time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{job.pickup_address}</span>
                </div>
              </div>
            )}

            {customNote && (
              <p className="text-sm text-gray-400 italic">{customNote}</p>
            )}

            <p className="text-xs text-gray-400 mt-2">Driver: {driverName}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Print Sign
        </button>
        <button
          onClick={() => { setPassengerName(''); setFlightNumber(''); setCustomNote('') }}
          className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
