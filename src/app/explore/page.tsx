'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DuoTripCard } from '@/components/cards/DuoTripCard'
import { requestToJoinDuoTrip } from '@/app/actions/duo-trips'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Plus } from 'lucide-react'

function ExploreContent() {
  const searchParams = useSearchParams()
  const [allAvailableTrips, setAllAvailableTrips] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [genderFilter, setGenderFilter] = useState<string>('any')
  const [sentRequestsMap, setSentRequestsMap] = useState<Record<string, string>>({})
  const [unreadCountsMap, setUnreadCountsMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: currentUserData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setCurrentUser(currentUserData)

      // Fetch duo trips created by others
      const { data: otherTrips } = await supabase
        .from('trips')
        .select('*, users(*)')
        .eq('trip_type', 'duo')
        .neq('user_id', user.id)
      
      // Fetch sent requests
      const { data: sentRequests } = await supabase
        .from('duo_trip_requests')
        .select('trip_id, status')
        .eq('user_id', user.id)
      
      const reqMap: Record<string, string> = {}
      sentRequests?.forEach(r => {
        reqMap[r.trip_id] = r.status
      })
      setSentRequestsMap(reqMap)

      // Fetch unread messages
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false)
      
      const counts: Record<string, number> = {}
      unreadMsgs?.forEach(m => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1
      })
      setUnreadCountsMap(counts)

      if (otherTrips) {
        setAllAvailableTrips(otherTrips)
      }
      setLoading(false)
    }

    loadData()

    const channel = supabase
      .channel('duo_trip_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duo_trip_requests'
        },
        (payload) => {
          setSentRequestsMap(prev => ({
            ...prev,
            [payload.new.trip_id]: payload.new.status
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('explore_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new
        if (newMsg.receiver_id === currentUser.id && newMsg.is_read === false) {
          setUnreadCountsMap(prev => ({
            ...prev,
            [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    let filtered = allAvailableTrips

    // Filter from Navbar
    const filterGender = searchParams.get('gender') // this is the creator's gender? Or preference? The user wants filtering. Let's filter by creator's gender for now.
    const filterVerified = searchParams.get('verified')
    const filterLocation = searchParams.get('location')
    const filterBudget = searchParams.get('budget')
    const filterInterests = searchParams.get('interests')

    if (filterGender === 'female') {
      filtered = filtered.filter(t => t.users?.gender?.toLowerCase() === 'female')
    }
    if (filterVerified === 'true') {
      filtered = filtered.filter(t => t.users?.verified === true)
    }
    if (filterLocation) {
      filtered = filtered.filter(t => t.destination?.toLowerCase().includes(filterLocation.toLowerCase()))
    }
    if (filterBudget) {
      filtered = filtered.filter(t => t.budget === filterBudget)
    }
    if (filterInterests) {
      const interestsArr = filterInterests.toLowerCase().split(',').map(s => s.trim())
      filtered = filtered.filter(t => {
        if (!t.users?.interests) return false
        return interestsArr.some(interest => 
          t.users.interests.some((ui: string) => ui.toLowerCase().includes(interest))
        )
      })
    }
    if (genderFilter !== 'any') {
      filtered = filtered.filter(t => t.gender_preference === genderFilter)
    }

    // Only show trips where the user is eligible to join based on their gender
    if (currentUser?.gender) {
      const uGen = currentUser.gender.toLowerCase()
      filtered = filtered.filter(t => {
        const pref = t.gender_preference?.toLowerCase() || 'any'
        if (pref === 'any') return true
        if (pref === 'male_only' && uGen === 'male') return true
        if (pref === 'female_only' && uGen === 'female') return true
        return false
      })
    }

    const scoredTrips = filtered.map(trip => {
      let score = 50

      // Match interests
      if (trip.preferred_interests && trip.preferred_interests.length > 0 && currentUser.interests) {
        const common = trip.preferred_interests.filter((i: string) => currentUser.interests.includes(i))
        score += (common.length / trip.preferred_interests.length) * 30
      } else {
        score += 15
      }

      // Budget match
      if (trip.budget === currentUser.budget_range) {
        score += 15
      }

      // Gender preference match
      if (trip.gender_preference && trip.gender_preference !== 'any') {
        if (currentUser.gender?.toLowerCase() === trip.gender_preference.toLowerCase()) {
          score += 20
        } else {
          score -= 30
        }
      } else {
        score += 15
      }

      // Age match
      if (currentUser.age) {
        if (currentUser.age >= trip.age_min && currentUser.age <= trip.age_max) {
          score += 15
        } else {
          score -= 20
        }
      }

      score = Math.max(0, Math.min(100, score))

      return {
        ...trip,
        compatibility: score,
        requestStatus: sentRequestsMap[trip.id] || null,
        unreadCount: unreadCountsMap[trip.user_id] || 0
      }
    }).sort((a, b) => b.compatibility - a.compatibility)
    
    setTrips(scoredTrips)
  }, [allAvailableTrips, currentUser, searchParams, sentRequestsMap, unreadCountsMap, genderFilter])

  const handleJoinRequest = async (tripId: string) => {
    const res = await requestToJoinDuoTrip(tripId)
    if (res.success) {
      setSentRequestsMap(prev => ({
        ...prev,
        [tripId]: 'pending'
      }))
    } else {
      alert('Failed to send request: ' + res.error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Explore Duo Trips</h1>
          <p className="text-gray-500 mt-2">Find a travel partner for your next adventure.</p>
        </div>
        
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

      {!currentUser?.name || !currentUser?.age || !currentUser?.location || !currentUser?.interests?.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Complete your profile to find trips</h2>
            <p className="text-gray-500 mb-6">We need a bit more info to match you with the best travel buddies!</p>
            <Link 
              href="/profile/edit"
              className="inline-flex justify-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-sm"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No Duo Trips found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {trips.map(trip => (
            <DuoTripCard
              key={trip.id}
              trip={trip}
              compatibilityScore={trip.compatibility}
              onRequestToJoin={handleJoinRequest}
              requestStatus={trip.requestStatus}
              unreadCount={trip.unreadCount}
              currentUserGender={currentUser?.gender}
            />
          ))}
        </div>
      )}

      <Link
        href="/create-trip"
        className="fixed bottom-24 sm:bottom-8 right-6 sm:right-8 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-40 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        aria-label="Create Duo Trip"
        title="Create Duo Trip"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>}>
      <ExploreContent />
    </Suspense>
  )
}
