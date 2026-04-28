'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.tripId as string
  
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from('group_trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (tripError || !tripData) {
        // Might be a Duo trip, fallback check
        const { data: duoTripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single()
          
        if (duoTripData) {
          setTrip(duoTripData)
        } else {
          router.push('/group-trips')
          return
        }
      } else {
        setTrip(tripData)

        // Access control: must be creator or have an accepted request
        if (tripData.creator_id !== user.id) {
          const { data: acceptedReq } = await supabase
            .from('trip_requests')
            .select('id')
            .eq('trip_id', tripId)
            .eq('user_id', user.id)
            .eq('status', 'accepted')
            .single()

          if (!acceptedReq) {
            router.push('/group-trips')
            return
          }
        }
      }

      // Fetch messages
      const { data: msgs } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(name, profile_image_url)
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })

      if (msgs) {
        setMessages(msgs)
      }

      setLoading(false)
    }

    loadData()
  }, [tripId, router])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`group_chat_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trip_id=eq.${tripId}`
        },
        async (payload) => {
          const newMsg = payload.new
          // Fetch sender details since realtime payload doesn't include joined relations
          const { data: senderData } = await supabase
            .from('users')
            .select('name, profile_image_url')
            .eq('id', newMsg.sender_id)
            .single()

          setMessages(prev => [...prev, { ...newMsg, sender: senderData }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !trip) return

    const { error } = await supabase.from('messages').insert({
      trip_id: trip.id,
      sender_id: currentUser.id,
      content: newMessage.trim(),
      is_read: false
    })

    if (error) {
      alert('Failed to send message: ' + error.message)
    } else {
      setNewMessage('')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-4">
          <Link href="/group-trips" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 leading-tight">{trip?.destination} Group Chat</h2>
              <p className="text-xs text-gray-500">
                {new Date(trip?.start_date).toLocaleDateString()} - {new Date(trip?.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No messages yet. Say hello to your travel buddies!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id
            const senderName = msg.sender?.name || 'Unknown'
            const senderInitials = senderName.substring(0, 2).toUpperCase()

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-end gap-2 max-w-[80%]">
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500 mb-1">
                      {msg.sender?.profile_image_url ? (
                        <img src={msg.sender.profile_image_url} alt={senderName} className="w-full h-full object-cover" />
                      ) : senderInitials}
                    </div>
                  )}
                  <div className="flex flex-col">
                    {!isMe && <span className="text-xs text-gray-500 ml-1 mb-1">{senderName}</span>}
                    <div className={`px-4 py-3 rounded-2xl ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-900 rounded-bl-none shadow-sm border border-gray-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 mx-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  )
}
