import { MapPin, Calendar, DollarSign, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface GroupTripCardProps {
  trip: {
    id: string
    destination: string
    start_date: string
    end_date: string
    budget: string | null
    description: string | null
    user_id: string
    gender_preference?: string | null
    users?: { name: string, profile_image_url: string } // Joined creator data
    current_members?: number
    max_members?: number
  }
  onJoin: (id: string) => void
  requestStatus?: string // 'pending', 'accepted', 'rejected'
  currentUserId?: string // to prevent self-join
  currentUserGender?: string | null
}

export function GroupTripCard({ trip, onJoin, requestStatus, currentUserId, currentUserGender }: GroupTripCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{trip.destination}</h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <span className="font-medium text-primary-600">
                Created by {trip.users?.name || 'Unknown'}
              </span>
            </div>
            {trip.max_members && (
              <div className="text-sm font-medium text-gray-700 mt-2 bg-gray-50 inline-block px-2 py-1 rounded-md">
                {trip.current_members || 1} / {trip.max_members} members
              </div>
            )}
            {trip.gender_preference && trip.gender_preference !== 'any' && (
              <div className={`text-xs font-bold px-2 py-1 mt-2 inline-block rounded-md ${
                trip.gender_preference === 'female_only' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {trip.gender_preference === 'female_only' ? 'Female Only' : 'Male Only'}
              </div>
            )}
          </div>
        </div>

        {trip.description && (
          <p className="text-gray-600 text-sm mb-6 line-clamp-3">{trip.description}</p>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-primary-500" />
            {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
          </div>
          {trip.budget && (
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-2 text-primary-500" />
              Budget: {trip.budget}
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 pb-6 mt-auto">
        {currentUserId === trip.user_id ? (
          <div className="w-full font-medium py-2 px-4 rounded-xl text-sm bg-gray-100 text-gray-500 text-center">
            Your Trip
          </div>
        ) : requestStatus === 'accepted' ? (
          <Link 
            href={`/chat/group/${trip.id}`}
            className="w-full flex items-center justify-center font-medium py-2 px-4 rounded-xl transition-colors text-sm bg-primary-600 hover:bg-primary-700 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Group Chat
          </Link>
        ) : (() => {
          let disabledReason = null
          if (requestStatus === 'pending') disabledReason = 'Requested'
          else if (requestStatus === 'accepted') disabledReason = 'Joined'
          else if (trip.max_members && (trip.current_members || 1) >= trip.max_members) disabledReason = 'Trip Full'
          else if (trip.gender_preference === 'female_only' && currentUserGender?.toLowerCase() !== 'female') disabledReason = 'Female Only'
          else if (trip.gender_preference === 'male_only' && currentUserGender?.toLowerCase() !== 'male') disabledReason = 'Male Only'

          return (
            <button 
              onClick={() => onJoin(trip.id)}
              disabled={disabledReason !== null}
              className={`w-full font-medium py-2 px-4 rounded-xl transition-colors text-sm ${
                disabledReason !== null
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {disabledReason || 'Request to Join'}
            </button>
          )
        })()}
      </div>
    </div>
  )
}
