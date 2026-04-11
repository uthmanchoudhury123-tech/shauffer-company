'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, ArrowLeft, User } from 'lucide-react'

interface Room {
  id: string
  job_id: string | null
  created_at: string
  job: { id: string; pickup_address: string; dropoff_address: string; job_date: string; status: string } | null
  poster: { id: string; full_name: string } | null
  driver: { id: string; full_name: string } | null
}

interface Message {
  id: string
  body: string
  sender_id: string
  created_at: string
}

interface Props {
  rooms: Room[]
  currentUserId: string
}

function timeStr(d: string) {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function dateStr(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function ChatClient({ rooms, currentUserId }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function getOtherPerson(room: Room) {
    if (room.poster?.id === currentUserId) return room.driver
    return room.poster
  }

  async function loadMessages(roomId: string) {
    setLoading(true)
    const res = await fetch(`/api/freelancer/chat/${roomId}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }

  async function openRoom(room: Room) {
    setSelectedRoom(room)
    await loadMessages(room.id)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages every 5s when in a room
  useEffect(() => {
    if (!selectedRoom) return
    const iv = setInterval(() => loadMessages(selectedRoom.id), 5000)
    return () => clearInterval(iv)
  }, [selectedRoom])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !selectedRoom) return
    setSending(true)
    const body = input.trim()
    setInput('')
    const res = await fetch('/api/freelancer/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: selectedRoom.id, body }),
    })
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
    }
    setSending(false)
  }

  if (rooms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-800">
            <MessageSquare className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-300 font-medium">No conversations yet</p>
          <p className="text-gray-500 text-sm mt-1">Chats are created when a job is accepted</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Rooms sidebar */}
      <div className={`w-full lg:w-80 flex-shrink-0 border-r border-gray-800 flex flex-col ${selectedRoom ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 py-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">Chat</h1>
          <p className="text-gray-400 text-sm mt-0.5">{rooms.length} conversation{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map(room => {
            const other = getOtherPerson(room)
            const isSelected = selectedRoom?.id === room.id
            return (
              <button
                key={room.id}
                onClick={() => openRoom(room)}
                className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${isSelected ? 'bg-gray-800/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{other?.full_name ?? 'Driver'}</p>
                    {room.job && (
                      <p className="text-gray-500 text-xs truncate mt-0.5">
                        {room.job.pickup_address} → {room.job.dropoff_address}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{dateStr(room.created_at)}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Message panel */}
      {selectedRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
            <button onClick={() => setSelectedRoom(null)} className="lg:hidden text-gray-400 hover:text-white p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{getOtherPerson(selectedRoom)?.full_name ?? 'Driver'}</p>
              {selectedRoom.job && (
                <p className="text-gray-500 text-xs truncate">
                  {selectedRoom.job.pickup_address} → {selectedRoom.job.dropoff_address}
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No messages yet. Say hello!</div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === currentUserId
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                        {timeStr(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-800 flex items-center gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center">
          <div>
            <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
