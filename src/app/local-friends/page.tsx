'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LocalFriendCard } from '@/components/cards/LocalFriendCard'
import { sendConnectionRequest } from '@/app/actions/connections'

export default function LocalFriendsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadLocalFriends() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: currentUserData } = await supabase
        .from('users')
        .select('location')
        .eq('id', user.id)
        .single()

      if (!currentUserData?.location) {
        setLoading(false)
        return
      }

      // Fetch all users in the same location
      const { data: localUsers } = await supabase
        .from('users')
        .select('*')
        .eq('location', currentUserData.location)
        .neq('id', user.id)
      
      // Fetch sent requests
      const { data: sentRequests } = await supabase
        .from('connections')
        .select('receiver_id')
        .eq('sender_id', user.id)
      
      const sentRequestIds = new Set(sentRequests?.map(r => r.receiver_id) || [])

      if (localUsers) {
        // Filter out users we've already sent requests to
        const availableUsers = localUsers.filter(u => !sentRequestIds.has(u.id))
        setUsers(availableUsers)
      }
      setLoading(false)
    }

    loadLocalFriends()
  }, [])

  const handleConnect = async (id: string) => {
    const res = await sendConnectionRequest(id)
    if (res.success) {
      setUsers(users.filter(u => u.id !== id))
    } else {
      alert('Failed to send request: ' + res.error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Local Friends</h1>
        <p className="text-gray-500 mt-2">Connect with travelers and locals in your area.</p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No new users found in your location right now. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map(user => (
            <LocalFriendCard
              key={user.id}
              user={user}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
