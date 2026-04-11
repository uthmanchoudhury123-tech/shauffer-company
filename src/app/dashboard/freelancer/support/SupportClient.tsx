'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, Mail, Phone, CheckCircle2 } from 'lucide-react'

const FAQS = [
  {
    q: 'How does the freelancer marketplace work?',
    a: 'You can browse available jobs posted by other drivers who need someone to cover a job. Apply with a message, and if the poster accepts you, the job is yours. You can also post jobs you need covered.',
  },
  {
    q: 'How does the wallet and escrow system work?',
    a: 'When a driver posts a job, the payment is held in escrow from their wallet. Once you complete the job and the poster confirms completion, the funds are released to your wallet. This protects both parties.',
  },
  {
    q: 'How do I get paid?',
    a: 'Earnings go into your in-app wallet once the job poster releases funds. You can withdraw your balance to your bank account from the Wallet page.',
  },
  {
    q: 'What documents do I need to upload?',
    a: 'Required documents are your Driving Licence, PHV Licence, and Insurance Certificate. Recommended documents include your DBS Certificate and Vehicle MOT. Documents are reviewed by our team.',
  },
  {
    q: 'Can I cancel a job I\'ve accepted?',
    a: 'Cancellations are handled directly between drivers. Please message the job poster via the Chat feature as soon as possible if you need to cancel, so they can find an alternative.',
  },
  {
    q: 'How is my rating calculated?',
    a: 'Your rating is based on feedback from drivers whose jobs you\'ve completed. Consistently completing jobs and communicating well will help maintain a high rating.',
  },
  {
    q: 'What happens if a poster doesn\'t release funds?',
    a: 'If a job poster fails to release funds after job completion, please contact our support team with your job ID and we will review the case and release funds if the job was completed correctly.',
  },
]

export function SupportClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    // Simulate sending
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Support</h1>
        <p className="text-gray-400 text-sm mt-1">Get help with your account and jobs</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Contact options */}
        <div className="grid grid-cols-2 gap-4">
          <a href="mailto:support@platform.com"
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-blue-700/50 transition-colors">
            <div className="w-9 h-9 bg-blue-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Email Us</p>
              <p className="text-gray-500 text-xs">support@platform.com</p>
            </div>
          </a>
          <a href="tel:+441234567890"
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-blue-700/50 transition-colors">
            <div className="w-9 h-9 bg-green-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Call Us</p>
              <p className="text-gray-500 text-xs">Mon–Fri, 9am–6pm</p>
            </div>
          </a>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" /> Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-4 py-4 flex items-center justify-between gap-3"
                >
                  <p className="text-white text-sm font-medium">{faq.q}</p>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Send a Message</h2>
          {sent ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-medium">Message sent!</p>
                <p className="text-green-400/70 text-sm mt-0.5">We'll get back to you within 24 hours.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Subject *</label>
                <input required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="What do you need help with?"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Message *</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <button type="submit" disabled={sending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
