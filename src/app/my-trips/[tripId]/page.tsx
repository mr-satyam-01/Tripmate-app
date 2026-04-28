'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { acceptJoinRequest, rejectJoinRequest, removeParticipant } from '@/app/actions/duo-trips'
import { User, Check, X, MessageSquare, ArrowLeft, UserMinus } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TripRequestsPage() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let isGroup = false
      let fetchedTrip = null

      // Load Trip Details
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()
      
      if (tripData) {
        fetchedTrip = tripData
        isGroup = tripData.trip_type === 'group'
      } else {
        const { data: groupTripData } = await supabase
          .from('group_trips')
          .select('*')
          .eq('id', tripId)
          .single()
        
        if (groupTripData) {
          fetchedTrip = { ...groupTripData, trip_type: 'group' }
          isGroup = true
        }
      }

      if (fetchedTrip) {
        // Authorize owner
        if (fetchedTrip.user_id !== user.id && fetchedTrip.creator_id !== user.id) {
          setLoading(false)
          return
        }
        setTrip(fetchedTrip)

        // Load Requests with User Data
        const requestsTable = isGroup ? 'trip_requests' : 'duo_trip_requests'
        const { data: requestData } = await supabase
          .from(requestsTable)
          .select('*, users(*)')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false })

        if (requestData) {
          setRequests(requestData)
        }
      }

      setLoading(false)
    }

    if (tripId) {
      loadData()
    }
  }, [tripId, supabase])

  const handleAccept = async (requestId: string, requesterId: string) => {
    const isGroup = trip?.trip_type === 'group'
    const res = await acceptJoinRequest(requestId, tripId as string, requesterId, isGroup, trip?.max_members || 2)
    if (res.success) {
      // Update local state: set this one to accepted
      setRequests(prev => prev.map(req => {
        if (req.id === requestId) return { ...req, status: 'accepted' }
        if (!isGroup && req.status === 'pending') return { ...req, status: 'rejected' }
        return req
      }))
    } else {
      alert('Failed to accept request: ' + res.error)
    }
  }

  const handleReject = async (requestId: string) => {
    const isGroup = trip?.trip_type === 'group'
    const res = await rejectJoinRequest(requestId, isGroup)
    if (res.success) {
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'rejected' } : req
      ))
    } else {
      alert('Failed to reject request: ' + res.error)
    }
  }

  const handleRemove = async (requestId: string, requesterId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) return
    const isGroup = trip?.trip_type === 'group'
    const res = await removeParticipant(requestId, tripId as string, requesterId, isGroup)
    if (res.success) {
      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: 'rejected' } : req
      ))
    } else {
      alert('Failed to remove participant: ' + res.error)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  if (!trip) {
    return <div className="text-center py-12 text-gray-500">Trip not found</div>
  }

  const isGroup = trip.trip_type === 'group'
  const acceptedCount = requests.filter(req => req.status === 'accepted').length
  const isFull = isGroup ? acceptedCount >= ((trip.max_members || 2) - 1) : acceptedCount > 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/my-trips" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to My Trips
      </Link>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{trip.destination}</h1>
        <p className="text-gray-500">{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</p>
        {isFull && (
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
            <Check className="w-4 h-4 mr-1" /> Trip Full!
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Join Requests</h2>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No requests yet. Hang tight!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => {
            const requester = request.users
            return (
              <div key={request.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 text-gray-400">
                    {requester?.profile_image_url ? (
                      <img src={requester.profile_image_url} alt={requester.name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {requester?.name || 'Unknown User'}
                      <span className="text-sm font-normal text-gray-500">{requester?.age ? `${requester.age} y/o` : ''}</span>
                    </h3>
                    {requester?.gender && requester.gender !== 'Prefer not to say' && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                        {requester.gender}
                      </span>
                    )}
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {requester?.bio || 'No bio provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {request.status === 'pending' && !isFull && (
                    <>
                      <button 
                        onClick={() => handleReject(request.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4 mr-1.5" /> Reject
                      </button>
                      <button 
                        onClick={() => handleAccept(request.id, request.user_id)}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4 mr-1.5" /> Accept
                      </button>
                    </>
                  )}
                  
                  {request.status === 'accepted' && (
                    <>
                      <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-bold rounded-lg border border-green-100">
                        Accepted
                      </span>
                      <Link 
                        href={isGroup ? `/chat/group/${trip.id}` : "/chat"}
                        className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" /> Chat
                      </Link>
                      <button
                        onClick={() => handleRemove(request.id, request.user_id)}
                        className="flex items-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors"
                      >
                        <UserMinus className="w-4 h-4 mr-1.5" /> Remove
                      </button>
                    </>
                  )}

                  {request.status === 'rejected' && (
                    <span className="px-3 py-1.5 bg-gray-50 text-gray-500 text-sm font-bold rounded-lg border border-gray-200">
                      Rejected
                    </span>
                  )}
                  
                  {request.status === 'pending' && isFull && (
                    <span className="px-3 py-1.5 bg-gray-50 text-gray-400 text-sm font-medium rounded-lg">
                      Missed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
