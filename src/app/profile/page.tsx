'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User, MapPin, Calendar, DollarSign, Heart, Compass, Navigation } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Profile not found</h2>
        <p className="text-gray-500 mt-2">We couldn't load your profile data.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="h-48 bg-gradient-to-r from-primary-500 to-primary-600 relative">
          <Link 
            href="/profile/edit"
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-white/30"
          >
            Edit Profile
          </Link>
        </div>
        
        <div className="px-8 pb-10">
          <div className="relative flex justify-between items-end -mt-16 mb-6">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white bg-gray-100 shadow-md flex-shrink-0 flex items-center justify-center text-gray-400">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <User size={64} />
              )}
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">{profile.name || 'Unnamed Traveler'} {profile.age && <span className="font-normal text-gray-400">, {profile.age}</span>}</h1>
            <div className="flex items-center gap-4 text-gray-500 mt-2 font-medium">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-primary-500" />
                {profile.location || 'Location not set'}
              </div>
              {profile.gender && profile.gender !== 'Prefer not to say' && (
                <div className="flex items-center text-sm px-2.5 py-0.5 bg-gray-100 rounded-md">
                  {profile.gender}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-500" /> About Me
                </h3>
                <p className="text-gray-600 leading-relaxed bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  {profile.bio || 'This user hasn\'t written a bio yet.'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary-500" /> Interests
                </h3>
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, idx: number) => (
                      <span key={idx} className="px-4 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-xl border border-primary-100">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No interests added.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                   Preferences
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Budget</div>
                    <div className="font-medium text-gray-900">{profile.budget_range || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" /> Travel Style</div>
                    <div className="font-medium text-gray-900 capitalize">{profile.travel_style || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Looking For</div>
                    <div className="font-medium text-gray-900 capitalize">{profile.looking_for || 'Not set'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
