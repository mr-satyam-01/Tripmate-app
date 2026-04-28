'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, DollarSign, MapPin, Users } from 'lucide-react'

export default function MyTripsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadMyTrips() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: myTrips } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)

      const { data: myGroupTrips } = await supabase
        .from('group_trips')
        .select('*')
        .eq('creator_id', user.id)

      const combinedTrips = [
        ...(myTrips || []),
        ...(myGroupTrips || []).map(t => ({ ...t, trip_type: 'group' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setTrips(combinedTrips)
      setLoading(false)
    }

    loadMyTrips()
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500 mt-2">Manage your created trips and review join requests.</p>
        </div>
        <Link 
          href="/create-trip"
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors shadow-sm"
        >
          Create New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">No trips created yet</h2>
            <p className="text-gray-500 mb-6">Create a trip to start finding travel partners!</p>
            <Link 
              href="/create-trip"
              className="inline-flex justify-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-sm"
            >
              Create Trip
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map(trip => (
            <Link 
              key={trip.id} 
              href={`/my-trips/${trip.id}`}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all block group relative"
            >
              <div className="absolute top-4 right-4 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1 rounded-full capitalize">
                {trip.trip_type}
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">{trip.destination}</h3>
                
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

              <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-primary-600 font-medium text-sm">
                <span>View Requests</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
