'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GroupTripCard } from '@/components/cards/GroupTripCard'
import { createGroupTrip, requestToJoinTrip } from '@/app/actions/trips'

export default function GroupTripsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [requestStatusMap, setRequestStatusMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [genderFilter, setGenderFilter] = useState<string>('any')
  const supabase = createClient()

  useEffect(() => {
    async function loadTrips() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setCurrentUserId(user.id)
      
      const { data: userData } = await supabase.from('users').select('gender').eq('id', user.id).single()
      if (userData) setCurrentUserGender(userData.gender)

      const { data: tripsData } = await supabase
        .from('group_trips')
        .select(`
          *,
          users (
            name,
            profile_image_url
          )
        `)
        .neq('creator_id', user.id)
        .order('created_at', { ascending: false })

      const { data: requestsData } = await supabase
        .from('trip_requests')
        .select('trip_id, status, user_id')

      if (tripsData) {
        const memberCounts: Record<string, number> = {}
        const userRequestStatuses: Record<string, string> = {}

        requestsData?.forEach(r => {
          // Track user's requests
          if (r.user_id === user.id) {
            userRequestStatuses[r.trip_id] = r.status
          }
          // Track total accepted members per trip
          if (r.status === 'accepted') {
            memberCounts[r.trip_id] = (memberCounts[r.trip_id] || 0) + 1
          }
        })

        setRequestStatusMap(userRequestStatuses)
        
        const enhancedTrips = tripsData.map(t => ({
          ...t,
          current_members: (memberCounts[t.id] || 0) + 1 // +1 for the creator
        }))
        let filteredTrips = enhancedTrips
        if (genderFilter !== 'any') {
          filteredTrips = filteredTrips.filter(t => t.gender_preference === genderFilter)
        }
        
        setTrips(filteredTrips)
      }
      
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

  const handleCreateTrip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const res = await createGroupTrip(formData)
    
    if (res.success) {
      setShowModal(false)
      window.location.reload() // Simple refresh to show new trip
    } else {
      alert('Failed to create trip: ' + res.error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Group Trips</h1>
          <p className="text-gray-500 mt-2">Join an existing trip or create your own adventure.</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            <button 
              onClick={() => setGenderFilter('any')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${genderFilter === 'any' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Trips
            </button>
            <button 
              onClick={() => setGenderFilter('women_only')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${genderFilter === 'women_only' ? 'bg-pink-50 text-pink-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Women Only
            </button>
            <button 
              onClick={() => setGenderFilter('men_only')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${genderFilter === 'men_only' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Men Only
            </button>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-xl transition-colors shadow-sm"
          >
            Create Trip
          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Create a Group Trip</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input required name="destination" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. Bali, Indonesia" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input required name="start_date" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input required name="end_date" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <input name="budget" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="e.g. $1000 - $1500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
                  <select name="max_members" defaultValue="10" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white">
                    {[...Array(19)].map((_, i) => (
                      <option key={i + 2} value={i + 2}>{i + 2} People</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Who can join?</label>
                  <select name="gender_preference" defaultValue="any" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white">
                    <option value="any">Anyone</option>
                    <option value="men_only">Men Only</option>
                    <option value="women_only">Women Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required name="description" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none" placeholder="Tell us about the trip..."></textarea>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors">
                  Publish Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
