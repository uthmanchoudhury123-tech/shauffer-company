'use client'

import { useState } from 'react'
import { Printer, Download, Send, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface LineItem { description: string; qty: number; rate: number }

interface Props {
  job: any
  company: any
  driverName: string | null
}

export function InvoiceClient({ job, company, driverName }: Props) {
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(job.id).slice(0, 6).toUpperCase()}`
  const issuedDate = new Date().toLocaleDateString('en-GB')
  const dueDate = new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB')

  const defaultItems: LineItem[] = [{
    description: `Chauffeur Service — ${job.pickup_address.split(',')[0]} to ${job.dropoff_address.split(',')[0]}`,
    qty: 1,
    rate: job.client_price ?? job.price ?? 0,
  }]

  const [items, setItems] = useState<LineItem[]>(defaultItems)
  const [vatRate, setVatRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const vatAmount = subtotal * (vatRate / 100)
  const total = subtotal + vatAmount

  function addItem() {
    setItems(prev => [...prev, { description: '', qty: 1, rate: 0 }])
  }
  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }
  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: field === 'description' ? value : Number(value) } : item
    ))
  }

  async function sendInvoice() {
    if (!job.client_email) {
      alert('No client email on this job. Edit the job to add one.')
      return
    }
    setSending(true)
    // Placeholder — in production this would call an email API
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      {/* Toolbar */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center gap-3 print:hidden">
        <a
          href="/dashboard/admin/jobs"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </a>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={sendInvoice}
            disabled={sending || sent}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${
              sent
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            {sent ? 'Sent!' : sending ? 'Sending...' : 'Send to Client'}
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="bg-gray-900 text-white px-8 py-7 flex items-start justify-between">
          <div>
            {company?.logo_url && (
              <img src={company.logo_url} alt={company?.name} className="h-10 w-auto object-contain mb-3 brightness-0 invert" />
            )}
            <p className="text-xl font-bold">{company?.name ?? 'Chauffex'}</p>
            {company?.address && <p className="text-sm text-gray-400 mt-0.5">{company.address}</p>}
            {company?.email   && <p className="text-sm text-gray-400">{company.email}</p>}
            {company?.phone   && <p className="text-sm text-gray-400">{company.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">INVOICE</p>
            <p className="text-sm text-gray-400 mt-1">{invoiceNumber}</p>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Bill To + Dates */}
          <div className="flex justify-between gap-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
              <p className="text-sm font-semibold text-gray-900">{job.client_name ?? 'Client'}</p>
              {job.client_email && <p className="text-sm text-gray-500">{job.client_email}</p>}
              {job.client_phone && <p className="text-sm text-gray-500">{job.client_phone}</p>}
            </div>
            <div className="text-right space-y-1">
              <div>
                <p className="text-xs text-gray-400">Issue Date</p>
                <p className="text-sm font-medium text-gray-800">{issuedDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Due Date</p>
                <p className="text-sm font-medium text-gray-800">{dueDate}</p>
              </div>
            </div>
          </div>

          {/* Job Details strip */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-900 flex flex-wrap gap-x-6 gap-y-1">
            <span><strong>Date:</strong> {formatDate(job.job_date)} {job.job_time}</span>
            <span><strong>From:</strong> {job.pickup_address.split(',')[0]}</span>
            <span><strong>To:</strong> {job.dropoff_address.split(',')[0]}</span>
            {driverName && <span><strong>Driver:</strong> {driverName}</span>}
            {job.preferred_car_type && <span><strong>Vehicle:</strong> {job.preferred_car_model ?? job.preferred_car_type}</span>}
          </div>

          {/* Line items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2 w-full">Description</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2 px-4 whitespace-nowrap">Qty</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2 px-4 whitespace-nowrap">Rate</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2 whitespace-nowrap">Amount</th>
                  <th className="print:hidden w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-4">
                      <input
                        className="w-full text-sm text-gray-800 bg-transparent border-none outline-none focus:ring-0 print:pointer-events-none"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number" min="1"
                        className="w-14 text-right text-sm text-gray-800 bg-transparent border-none outline-none focus:ring-0 print:pointer-events-none"
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number" min="0" step="0.01"
                        className="w-20 text-right text-sm text-gray-800 bg-transparent border-none outline-none focus:ring-0 print:pointer-events-none"
                        value={item.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)}
                      />
                    </td>
                    <td className="py-2 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(item.qty * item.rate)}
                    </td>
                    <td className="py-2 pl-2 print:hidden">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={addItem}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 print:hidden"
            >
              <Plus className="w-3.5 h-3.5" /> Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 items-center">
                <span>VAT
                  <select
                    value={vatRate}
                    onChange={e => setVatRate(Number(e.target.value))}
                    className="ml-1 text-xs border border-gray-200 rounded px-1 print:hidden"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={20}>20%</option>
                  </select>
                  <span className="hidden print:inline"> ({vatRate}%)</span>
                </span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <textarea
              rows={2}
              className="w-full text-sm text-gray-600 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-0 print:p-0"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment terms, bank details, thank you message..."
            />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 text-center">
            Thank you for your business — {company?.name ?? 'Chauffex'}
          </div>
        </div>
      </div>
    </div>
  )
}
