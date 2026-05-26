'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Send, Search, ArrowLeft } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
}

interface Conversation {
  partnerId: string
  partnerName: string
  lastMessage: string
  lastTime: string
  unreadCount: number
}

interface Props {
  currentUserId: string
  currentUserName: string
}

export function MessagesPage({ currentUserId, currentUserName }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Load all conversations ─────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const supabase = createClient()

    const { data: allMsgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    if (!allMsgs || allMsgs.length === 0) {
      setConversations([])
      setLoadingConvs(false)
      return
    }

    // Unique partner IDs
    const partnerIds = [...new Set(allMsgs.map((m: Message) =>
      m.sender_id === currentUserId ? m.recipient_id : m.sender_id
    ))]

    // Fetch names
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', partnerIds)

    const nameMap: Record<string, string> = {}
    for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? 'Unknown'

    // Group by partner
    const convMap: Record<string, { msgs: Message[] }> = {}
    for (const msg of allMsgs as Message[]) {
      const pid = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id
      if (!convMap[pid]) convMap[pid] = { msgs: [] }
      convMap[pid].msgs.push(msg)
    }

    const convs: Conversation[] = Object.entries(convMap).map(([pid, { msgs }]) => ({
      partnerId: pid,
      partnerName: nameMap[pid] ?? 'Unknown',
      lastMessage: msgs[0]?.content ?? '',
      lastTime: msgs[0]?.created_at ?? '',
      unreadCount: msgs.filter(m => m.recipient_id === currentUserId && !m.read).length,
    }))
    // Sort by latest message
    convs.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())

    setConversations(convs)
    setLoadingConvs(false)
  }, [currentUserId])

  // ── Load messages for selected conversation ────────────────────────────────
  const loadMessages = useCallback(async (partnerId: string) => {
    setLoadingMsgs(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},recipient_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},recipient_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })

    setMessages(data ?? [])
    setLoadingMsgs(false)

    // Mark as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('recipient_id', currentUserId)
      .eq('sender_id', partnerId)
      .eq('read', false)

    // Update unread count in list
    setConversations(prev => prev.map(c =>
      c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c
    ))
  }, [currentUserId])

  // ── Initial load + realtime ────────────────────────────────────────────────
  useEffect(() => {
    loadConversations()
    const supabase = createClient()

    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Message
        const isForMe = msg.sender_id === currentUserId || msg.recipient_id === currentUserId
        if (!isForMe) return

        // Update messages panel if conversation is open
        const partnerId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id
        setSelected(prev => {
          if (prev?.partnerId === partnerId) {
            setMessages(m => [...m, msg])
            if (msg.recipient_id === currentUserId) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id)
            }
          }
          return prev
        })

        // Refresh conversation list
        loadConversations()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, loadConversations])

  // ── Load messages when conversation selected ───────────────────────────────
  useEffect(() => {
    if (selected) loadMessages(selected.partnerId)
  }, [selected?.partnerId])

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || !selected) return
    setSending(true)
    const supabase = createClient()
    await supabase.from('messages').insert({
      sender_id: currentUserId,
      recipient_id: selected.partnerId,
      content: input.trim(),
    })
    setInput('')
    setSending(false)
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    return isToday
      ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const filtered = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full bg-white" style={{ height: 'calc(100vh - 0px)' }}>

      {/* ── Left: Conversation list ──────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-gray-200 bg-white
        ${selected ? 'hidden lg:flex w-80 flex-shrink-0' : 'flex-1 lg:flex lg:w-80 lg:flex-none lg:flex-shrink-0'}`}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {conversations.reduce((a, c) => a + c.unreadCount, 0)} unread
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-gray-400">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <MessageSquare className="w-8 h-8 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Messages from job applications will appear here</p>
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.partnerId}
                onClick={() => setSelected(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 transition-colors text-left
                  ${selected?.partnerId === conv.partnerId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                  {conv.partnerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {conv.partnerName}
                    </p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(conv.lastTime)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Chat panel ────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selected ? 'hidden lg:flex' : 'flex'}`}>
        {!selected ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-gray-700 font-semibold">Select a conversation</p>
            <p className="text-gray-400 text-sm mt-1">Choose someone from the left to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {selected.partnerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selected.partnerName}</p>
                <p className="text-xs text-gray-400">Direct message</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">Loading messages…</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No messages yet — say hello!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`Message ${selected.partnerName}…`}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
