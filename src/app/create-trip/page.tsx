'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CreateTripPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [tripType, setTripType] = useState('duo')
  const [maxMembers, setMaxMembers] = useState('4')
  const [genderPreference, setGenderPreference] = useState('any')

  // Basic Details
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('Moderate ($$)')
  const [description, setDescription] = useState('')

  // Matching Preferences
  const [ageMin, setAgeMin] = useState('18')
  const [ageMax, setAgeMax] = useState('99')
  const [interests, setInterests] = useState('')
  const [travelStyle, setTravelStyle] = useState('flexible')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const parsedInterests = interests.split(',').map(s => s.trim()).filter(Boolean)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          destination,
          start_date: startDate,
          end_date: endDate,
          budget,
          description,
          trip_type: tripType,
          gender_preference: genderPreference,
          age_min: parseInt(ageMin),
          age_max: parseInt(ageMax),
          preferred_interests: parsedInterests,
          travel_style: travelStyle,
          max_members: tripType === 'duo' ? 2 : parseInt(maxMembers)
        })

      if (error) {
        alert('Failed to create trip: ' + error.message)
      } else {
        router.push('/explore')
      }
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-6 px-4">
        <Link href="/explore" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Link>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a {tripType === 'duo' ? 'Duo' : 'Group'} Trip</h1>
        <p className="text-gray-500 mb-8">
          {tripType === 'duo' 
            ? 'Plan an adventure and find the perfect travel partner (1 spot available).' 
            : 'Plan an adventure and gather a group of like-minded travelers.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Trip Type Selection */}
          <div className="flex gap-4 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setTripType('duo')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                tripType === 'duo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Duo Trip
            </button>
            <button
              type="button"
              onClick={() => setTripType('group')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                tripType === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Group Trip
            </button>
          </div>

          {/* Section 1: Basic Details */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 mb-6">Trip Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input required value={destination} onChange={e => setDestination(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="e.g. Kyoto, Japan" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input required value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input required value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <select value={budget} onChange={e => setBudget(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                    <option value="Budget ($)">Budget ($)</option>
                    <option value="Moderate ($$)">Moderate ($$)</option>
                    <option value="Luxury ($$$)">Luxury ($$$)</option>
                  </select>
                </div>

                {tripType === 'group' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of People</label>
                    <select value={maxMembers} onChange={e => setMaxMembers(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                      {[...Array(19)].map((_, i) => (
                        <option key={i + 2} value={i + 2}>{i + 2} People</option>
                      ))}
                    </select>
                  </div>
                )}
                

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 resize-none outline-none" placeholder="What are you planning to do on this trip?"></textarea>
              </div>
            </div>
          </div>

          {/* Section 2: Matching Preferences */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 mb-6">Matching Preferences</h2>
            <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Gender</label>
                  <select value={genderPreference} onChange={e => setGenderPreference(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                    <option value="any">Any Gender</option>
                    <option value="male_only">Male Only</option>
                    <option value="female_only">Female Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Travel Style</label>
                  <select value={travelStyle} onChange={e => setTravelStyle(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                    <option value="flexible">Flexible</option>
                    <option value="relaxed">Relaxed / Chill</option>
                    <option value="packed">Action Packed</option>
                    <option value="party">Party / Nightlife</option>
                    <option value="nature">Nature / Outdoors</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Age</label>
                  <input required value={ageMin} onChange={e => setAgeMin(e.target.value)} type="number" min="18" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Age</label>
                  <input required value={ageMax} onChange={e => setAgeMax(e.target.value)} type="number" min="18" max="99" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Interests (comma separated)</label>
                <input value={interests} onChange={e => setInterests(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white" placeholder="e.g. Photography, Food, Hiking" />
                <p className="text-xs text-gray-500 mt-1">Leave blank to not filter by interests.</p>
              </div>

            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-70 text-lg"
            >
              {loading ? 'Creating Trip...' : `Create ${tripType === 'duo' ? 'Duo' : 'Group'} Trip`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
