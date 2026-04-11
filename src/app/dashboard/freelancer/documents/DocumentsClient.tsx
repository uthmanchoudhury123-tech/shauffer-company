'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload, Trash2, AlertTriangle, CheckCircle2, Clock, X, Plus } from 'lucide-react'

interface Doc {
  id: string
  doc_type: string
  file_name: string
  file_url: string | null
  expiry_date: string | null
  status: string
  uploaded_at: string
}

interface Props {
  documents: Doc[]
  driverId: string
}

const DOC_TYPES = [
  { value: 'driving_licence',    label: 'Driving Licence',     required: true  },
  { value: 'phv_licence',        label: 'PHV Licence',          required: true  },
  { value: 'insurance',          label: 'Insurance Certificate',required: true  },
  { value: 'dbs_check',          label: 'DBS Certificate',      required: false },
  { value: 'mot',                label: 'Vehicle MOT',          required: false },
  { value: 'other',              label: 'Other',                required: false },
]

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Under Review', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: 'Approved',     color: 'bg-green-500/10 text-green-400 border-green-500/20',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected',     color: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: <X className="w-3.5 h-3.5" /> },
  expired:  { label: 'Expired',      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',      icon: <AlertTriangle className="w-3.5 h-3.5" /> },
}

function isExpiringSoon(expiry: string | null) {
  if (!expiry) return false
  const d = new Date(expiry)
  const days = (d.getTime() - Date.now()) / 86400000
  return days > 0 && days < 30
}

function isExpired(expiry: string | null) {
  if (!expiry) return false
  return new Date(expiry) < new Date()
}

export function DocumentsClient({ documents: initial, driverId }: Props) {
  const router = useRouter()
  const [documents, setDocuments] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ doc_type: 'driving_licence', file_name: '', expiry_date: '' })
  const [file, setFile] = useState<File | null>(null)

  const uploadedTypes = new Set(documents.map(d => d.doc_type))
  const requiredMissing = DOC_TYPES.filter(t => t.required && !uploadedTypes.has(t.value))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    fd.append('doc_type', form.doc_type)
    fd.append('file_name', file?.name ?? form.file_name)
    fd.append('expiry_date', form.expiry_date)
    if (file) fd.append('file', file)
    const res = await fetch('/api/freelancer/documents', { method: 'POST', body: fd })
    if (res.ok) {
      setShowAdd(false)
      setForm({ doc_type: 'driving_licence', file_name: '', expiry_date: '' })
      setFile(null)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/freelancer/documents?id=${id}`, { method: 'DELETE' })
    setDocuments(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 text-sm mt-1">{documents.length} uploaded</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {/* Missing required docs warning */}
      {requiredMissing.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">Missing required documents</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              {requiredMissing.map(t => t.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-800">
            <FileText className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-300 font-medium">No documents uploaded</p>
          <p className="text-gray-500 text-sm mt-1">Upload your licence, insurance, and DBS certificate</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {documents.map(doc => {
            const expiring = isExpiringSoon(doc.expiry_date)
            const expired = isExpired(doc.expiry_date)
            const effectiveStatus = expired ? 'expired' : doc.status
            const sc = statusConfig[effectiveStatus] ?? statusConfig.pending
            const typeInfo = DOC_TYPES.find(t => t.value === doc.doc_type)

            return (
              <div key={doc.id} className={`bg-gray-900 rounded-xl p-4 border ${expiring ? 'border-yellow-500/30' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{typeInfo?.label ?? doc.doc_type}</p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{doc.file_name}</p>
                      {doc.expiry_date && (
                        <p className={`text-xs mt-1 ${expiring ? 'text-yellow-400' : expired ? 'text-red-400' : 'text-gray-500'}`}>
                          Expires: {new Date(doc.expiry_date).toLocaleDateString('en-GB')}
                          {expiring && ' — Expiring soon!'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${sc.color}`}>
                      {sc.icon} {sc.label}
                    </span>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Document Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Upload Document</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Document Type *</label>
                <select required value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}{t.required ? ' *' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">File</label>
                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">{file ? file.name : 'Choose a file (PDF or image)'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              {!file && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Document Name *</label>
                  <input required={!file} value={form.file_name} onChange={e => setForm(p => ({ ...p, file_name: e.target.value }))}
                    placeholder="e.g. UK Driving Licence" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-gray-600 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
