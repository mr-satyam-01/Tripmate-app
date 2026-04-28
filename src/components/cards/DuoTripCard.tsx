'use client'

import { MapPin, Calendar, DollarSign, User, Users, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface DuoTripCardProps {
  trip: any
  compatibilityScore: number
  onRequestToJoin: (tripId: string) => void
  requestStatus: string | null
  unreadCount?: number
  currentUserGender?: string | null
}

export function DuoTripCard({ trip, compatibilityScore, onRequestToJoin, requestStatus, unreadCount, currentUserGender }: DuoTripCardProps) {
  const creator = trip.users

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
      <div className="absolute top-4 right-4 flex gap-2">
        {trip.gender_preference === 'women_only' && (
          <div className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-sm">
            Women Only
          </div>
        )}
        {trip.gender_preference === 'men_only' && (
          <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-sm">
            Men Only
          </div>
        )}
        <div className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full flex items-center">
          <Users className="w-3 h-3 mr-1" />
          1 spot left
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6 mt-4">
        <div className="h-16 w-16 rounded-full bg-primary-100 flex flex-shrink-0 items-center justify-center text-primary-700 overflow-hidden ring-4 ring-white shadow-sm">
          {creator?.profile_image_url ? (
            <img src={creator.profile_image_url} alt={creator.name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{creator?.name || 'Unknown'}</h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">{creator?.age ? `${creator.age} y/o` : ''}</p>
            {creator?.gender && creator.gender !== 'Prefer not to say' && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                {creator.gender}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-xl font-bold text-gray-900 mb-3">{trip.destination}</h4>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-primary-500" />
            {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="w-4 h-4 mr-2 text-primary-500" />
            {trip.budget}
          </div>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{trip.description}</p>
      </div>

      <div className="mb-6 bg-gray-50 p-4 rounded-2xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Trip Match Score</span>
          <span className="text-lg font-bold text-primary-600">{Math.round(compatibilityScore)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, compatibilityScore)}%` }}
          />
        </div>
      </div>

      {requestStatus === 'accepted' ? (
        <div className="flex gap-3">
          <div className="flex-1 py-3 px-4 rounded-xl font-bold bg-green-50 text-green-700 text-center border border-green-100 flex items-center justify-center">
            Accepted ✅
          </div>
          <Link
            href="/chat"
            className="flex-1 py-3 px-4 rounded-xl font-medium bg-primary-600 hover:bg-primary-700 text-white text-center shadow-sm flex items-center justify-center relative"
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Chat
            {(unreadCount ?? 0) > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center justify-center min-w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 shadow-sm border-2 border-white">
                {unreadCount}
              </div>
            )}
          </Link>
        </div>
      ) : (() => {
        let disabledReason = null
        if (requestStatus === 'pending') disabledReason = 'Pending'
        else if (requestStatus === 'accepted') disabledReason = 'Accepted'
        else if (trip.gender_preference === 'women_only' && currentUserGender?.toLowerCase() !== 'female') disabledReason = 'Women Only'
        else if (trip.gender_preference === 'men_only' && currentUserGender?.toLowerCase() !== 'male') disabledReason = 'Men Only'

        return (
          <button
            onClick={() => onRequestToJoin(trip.id)}
            disabled={disabledReason !== null}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-colors shadow-sm ${
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
  )
}
