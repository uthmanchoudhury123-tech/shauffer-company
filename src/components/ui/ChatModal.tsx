'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  jobId?: string
  freelancerJobId?: string
  jobTitle: string          // e.g. "Heathrow → Canary Wharf"
  currentUserId: string
  currentUserName: string
  recipientId: string
  recipientName: string
}

export function ChatModal({
  isOpen, onClose, jobId, freelancerJobId, jobTitle,
  currentUserId, currentUserName, recipientId, recipientName,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch existing messages & subscribe to realtime
  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    setLoading(true)

    async function loadMessages() {
      const query = supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (jobId) (query as any).eq('job_id', jobId)
      if (freelancerJobId) (query as any).eq('freelancer_job_id', freelancerJobId)

      const { data } = await query
      setMessages(data ?? [])
      setLoading(false)

      // Mark unread messages from recipient as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('recipient_id', currentUserId)
        .eq('sender_id', recipientId)
        .eq('read', false)
    }

    loadMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${currentUserId}-${recipientId}-${jobId ?? freelancerJobId ?? 'dm'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Message
        const isRelevant =
          (msg.sender_id === currentUserId && msg.recipient_id === recipientId) ||
          (msg.sender_id === recipientId && msg.recipient_id === currentUserId)
        if (isRelevant) {
          setMessages(prev => [...prev, msg])
          // Mark as read if we received it
          if (msg.recipient_id === currentUserId) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isOpen, currentUserId, recipientId, jobId, freelancerJobId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: input.trim(),
      job_id: jobId ?? null,
      freelancer_job_id: freelancerJobId ?? null,
    })
    setInput('')
    setSending(false)
  }

  if (!isOpen) return null

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ height: '520px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{recipientName}</p>
              <p className="text-xs text-blue-200 truncate">{jobTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Loading messages…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-300 mt-1">Start the conversation below</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                      {isMe && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
