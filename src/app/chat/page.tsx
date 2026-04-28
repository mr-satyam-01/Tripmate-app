'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Send } from 'lucide-react'

export default function ChatPage() {
  const [connections, setConnections] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const activeChatRef = useRef<any>(null)
  activeChatRef.current = activeChat

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUser(user)

      // Get accepted connections
      const { data: myConnections } = await supabase
        .from('connections')
        .select(`
          id,
          status,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

      // Get all messages to compute unread count and last message
      const { data: userMessages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (myConnections) {
        const mapped = myConnections.map((c: any) => {
          const senderId = Array.isArray(c.sender) ? c.sender[0]?.id : c.sender?.id
          const otherUser = senderId === user.id 
            ? (Array.isArray(c.receiver) ? c.receiver[0] : c.receiver)
            : (Array.isArray(c.sender) ? c.sender[0] : c.sender)
          
          const connectionMessages = userMessages?.filter(m => 
            (m.sender_id === user.id && m.receiver_id === otherUser.id) ||
            (m.sender_id === otherUser.id && m.receiver_id === user.id)
          ) || []

          const unreadCount = connectionMessages.filter(m => m.receiver_id === user.id && !m.is_read).length
          const lastMessage = connectionMessages.length > 0 ? connectionMessages[0].content : null

          return {
            connectionId: c.id,
            user: otherUser,
            status: c.status,
            unreadCount,
            lastMessage
          }
        })
        setConnections(mapped)
      }
    }

    loadData()

  }, [])

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new
        
        // Only process messages related to current user
        if (newMsg.sender_id !== currentUser.id && newMsg.receiver_id !== currentUser.id) return

        const currentActive = activeChatRef.current

        // 1. If chat is active, add to messages list
        if (currentActive && (
          (newMsg.sender_id === currentUser.id && newMsg.receiver_id === currentActive.user.id) ||
          (newMsg.sender_id === currentActive.user.id && newMsg.receiver_id === currentUser.id)
        )) {
          setMessages(prev => [...prev, newMsg])

          // If we received it while chat is open, immediately mark as read
          if (newMsg.receiver_id === currentUser.id) {
             supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then()
          }
        }

        // 2. Update connections sidebar (unread count & last message)
        setConnections(prev => prev.map(c => {
           if (c.user.id === newMsg.sender_id || c.user.id === newMsg.receiver_id) {
              const isActiveChat = currentActive && currentActive.user.id === newMsg.sender_id
              const isUnread = newMsg.receiver_id === currentUser.id && !isActiveChat
              
              return {
                 ...c,
                 lastMessage: newMsg.content,
                 unreadCount: isUnread ? c.unreadCount + 1 : c.unreadCount
              }
           }
           return c
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser])

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat || !currentUser) return

    async function loadMessagesAndMarkRead() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChat.user.id}),and(sender_id.eq.${activeChat.user.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data)

        // Mark all unread messages as read
        const unreadIds = data.filter(m => m.receiver_id === currentUser.id && !m.is_read).map(m => m.id)
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds)

          // Reset unread count locally
          setConnections(prev => prev.map(c => 
            c.user.id === activeChat.user.id ? { ...c, unreadCount: 0 } : c
          ))
        }
      }
    }

    loadMessagesAndMarkRead()
  }, [activeChat?.connectionId, currentUser]) // use connectionId to avoid rapid firing

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !currentUser) return

    const messageText = newMessage
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: activeChat.user.id,
      content: messageText,
      is_read: false
    })

    if (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-8rem)] flex">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Connections</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {connections.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No connections yet. Send requests on the Explore page!
            </div>
          ) : (
            connections.map(c => (
              <button
                key={c.connectionId}
                onClick={() => setActiveChat(c)}
                className={`w-full p-4 flex items-center gap-3 border-b border-gray-50 transition-colors relative ${
                  activeChat?.connectionId === c.connectionId ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0 overflow-hidden">
                  {c.user.profile_image_url ? (
                    <img src={c.user.profile_image_url} alt={c.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-gray-900 line-clamp-1">{c.user.name}</p>
                  {c.lastMessage ? (
                    <p className={`text-sm line-clamp-1 ${c.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {c.lastMessage}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 capitalize">{c.status}</p>
                  )}
                </div>
                {c.unreadCount > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 shadow-sm">
                    {c.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
               <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 overflow-hidden">
                  {activeChat.user.profile_image_url ? (
                    <img src={activeChat.user.profile_image_url} alt={activeChat.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{activeChat.user.name}</h3>
                </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
              {messages.map(m => {
                const isMine = m.sender_id === currentUser.id
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      isMine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <User size={48} className="mb-4 text-gray-300" />
            <p>Select a connection to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}
