'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupTripCard } from '@/components/cards/GroupTripCard'
import { requestToJoinTrip } from '@/app/actions/trips'

export default function GroupTripsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [requestStatusMap, setRequestStatusMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null)
  const [genderFilter, setGenderFilter] = useState<string>('any')
  const supabase = createClient()

  useEffect(() => {
    async function loadTrips() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUserId(user.id)
      
      const { data: userData } = await supabase.from('users').select('gender').eq('id', user.id).single()
      const userGender = userData?.gender || null
      setCurrentUserGender(userGender)

      // Fetch from group_trips table (legacy)
      const { data: legacyTrips } = await supabase
        .from('group_trips')
        .select(`*, users ( name, profile_image_url )`)
        .neq('creator_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch from trips table (new — created via Create Trip page)
      const { data: unifiedTrips } = await supabase
        .from('trips')
        .select(`*, users ( name, profile_image_url )`)
        .eq('trip_type', 'group')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Merge both sources, normalizing creator field
      const legacyNormalized = (legacyTrips || []).map(t => ({
        ...t,
        _source: 'group_trips' as const,
        _ownerId: t.creator_id
      }))
      const unifiedNormalized = (unifiedTrips || []).map(t => ({
        ...t,
        _source: 'trips' as const,
        _ownerId: t.user_id,
        creator_id: t.user_id // normalize for GroupTripCard
      }))

      // Deduplicate by id (in case a trip exists in both)
      const seenIds = new Set<string>()
      const allTrips: any[] = []
      for (const t of [...unifiedNormalized, ...legacyNormalized]) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id)
          allTrips.push(t)
        }
      }

      // Fetch requests from both tables
      const { data: groupRequests } = await supabase
        .from('trip_requests')
        .select('trip_id, status, user_id')
      const { data: duoRequests } = await supabase
        .from('duo_trip_requests')
        .select('trip_id, status, user_id')

      const allRequests = [...(groupRequests || []), ...(duoRequests || [])]

      const memberCounts: Record<string, number> = {}
      const userRequestStatuses: Record<string, string> = {}

      allRequests.forEach(r => {
        if (r.user_id === user.id) {
          userRequestStatuses[r.trip_id] = r.status
        }
        if (r.status === 'accepted') {
          memberCounts[r.trip_id] = (memberCounts[r.trip_id] || 0) + 1
        }
      })

      setRequestStatusMap(userRequestStatuses)
      
      const enhancedTrips = allTrips.map(t => ({
        ...t,
        current_members: (memberCounts[t.id] || 0) + 1
      }))

      let filteredTrips = enhancedTrips

      // Apply explicit gender toggle filter
      if (genderFilter !== 'any') {
        filteredTrips = filteredTrips.filter(t => t.gender_preference === genderFilter)
      }
      
      // Filter out trips the user is ineligible for based on their gender
      if (userGender) {
        const uGen = userGender.toLowerCase()
        filteredTrips = filteredTrips.filter(t => {
          const pref = t.gender_preference?.toLowerCase() || 'any'
          if (pref === 'any') return true
          if (pref === 'male_only' && uGen === 'male') return true
          if (pref === 'female_only' && uGen === 'female') return true
          return false
        })
      }
      
      setTrips(filteredTrips)
      setLoading(false)
    }

    loadTrips()
  }, [genderFilter])

  const handleJoin = async (id: string) => {
    const res = await requestToJoinTrip(id)
    if (res.success) {
      setRequestStatusMap(prev => ({ ...prev, [id]: 'pending' }))
    } else {
      alert('Failed to send request: ' + res.error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Group Trips</h1>
          <p className="text-gray-500 mt-2">Join an existing trip or create your own adventure.</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-wrap sm:flex-nowrap bg-white rounded-lg p-1 shadow-sm border border-gray-100 overflow-x-auto">
            <button 
              onClick={() => setGenderFilter('any')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${genderFilter === 'any' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Trips
            </button>
            <button 
              onClick={() => setGenderFilter('female_only')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${genderFilter === 'female_only' ? 'bg-pink-50 text-pink-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Female Only
            </button>
            <button 
              onClick={() => setGenderFilter('male_only')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${genderFilter === 'male_only' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Male Only
            </button>
          </div>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No group trips available yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {trips.map(trip => (
            <GroupTripCard
              key={trip.id}
              trip={trip}
              onJoin={handleJoin}
              requestStatus={requestStatusMap[trip.id]}
              currentUserId={currentUserId || undefined}
              currentUserGender={currentUserGender}
            />
          ))}
        </div>
      )}

    </div>
  )
}
