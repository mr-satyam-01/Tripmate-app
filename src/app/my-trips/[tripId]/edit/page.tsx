'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateTrip } from '@/app/actions/manage-trips'

export default function EditTripPage() {
  const router = useRouter()
  const { tripId } = useParams()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isGroupTable, setIsGroupTable] = useState(false)
  const [acceptedCount, setAcceptedCount] = useState(0)

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

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let fetchedTrip = null
      let group = false

      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()
      
      if (tripData) {
        fetchedTrip = tripData
        group = tripData.trip_type === 'group'
      } else {
        const { data: groupTripData } = await supabase
          .from('group_trips')
          .select('*')
          .eq('id', tripId)
          .single()
        
        if (groupTripData) {
          fetchedTrip = { ...groupTripData, trip_type: 'group' }
          group = true
        }
      }

      if (!fetchedTrip) {
        setLoading(false)
        return
      }

      // Check owner
      if (fetchedTrip.user_id !== user.id && fetchedTrip.creator_id !== user.id) {
        router.push('/my-trips')
        return
      }

      setIsGroupTable(fetchedTrip.trip_type === 'group' && !tripData)
      setTripType(fetchedTrip.trip_type)
      setDestination(fetchedTrip.destination || '')
      setStartDate(fetchedTrip.start_date || '')
      setEndDate(fetchedTrip.end_date || '')
      setBudget(fetchedTrip.budget || 'Moderate ($$)')
      setDescription(fetchedTrip.description || '')
      setMaxMembers(fetchedTrip.max_members?.toString() || '4')
      setGenderPreference(fetchedTrip.gender_preference || 'any')
      setAgeMin(fetchedTrip.age_min?.toString() || '18')
      setAgeMax(fetchedTrip.age_max?.toString() || '99')
      setInterests((fetchedTrip.preferred_interests || []).join(', '))
      setTravelStyle(fetchedTrip.travel_style || 'flexible')

      // Load accepted count to restrict changes
      const requestsTable = group ? 'trip_requests' : 'duo_trip_requests'
      const { data: reqData } = await supabase
        .from(requestsTable)
        .select('id')
        .eq('trip_id', tripId)
        .eq('status', 'accepted')
      
      if (reqData) {
        setAcceptedCount(reqData.length)
      }

      setLoading(false)
    }

    if (tripId) {
      loadData()
    }
  }, [tripId, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Validation
    if (new Date(endDate) < new Date(startDate)) {
      alert("End Date cannot be earlier than Start Date.")
      setSaving(false)
      return
    }

    if (tripType === 'group' && parseInt(maxMembers) < acceptedCount + 1) {
      alert(`Cannot reduce max members below the current accepted count (${acceptedCount + 1} including you).`)
      setSaving(false)
      return
    }

    const parsedInterests = interests.split(',').map(s => s.trim()).filter(Boolean)

    const data: any = {
      destination,
      start_date: startDate,
      end_date: endDate,
      budget,
      description,
      gender_preference: genderPreference,
      max_members: tripType === 'duo' ? 2 : parseInt(maxMembers)
    }

    // Only set these if using the unified trips table
    if (!isGroupTable) {
      data.trip_type = tripType
      data.age_min = parseInt(ageMin)
      data.age_max = parseInt(ageMax)
      data.preferred_interests = parsedInterests
      data.travel_style = travelStyle
    }

    const res = await updateTrip(tripId as string, isGroupTable, data)

    if (res.success) {
      router.push(`/my-trips/${tripId}`)
    } else {
      alert('Failed to update trip: ' + res.error)
    }
    
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-6 px-4">
        <Link href={`/my-trips/${tripId}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trip Details
        </Link>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Trip</h1>
        <p className="text-gray-500 mb-8">Update your travel plans and preferences.</p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Trip Type Selection */}
          {!isGroupTable && (
            <div className="flex gap-4 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                type="button"
                disabled={acceptedCount > 0}
                onClick={() => setTripType('duo')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  tripType === 'duo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                } ${acceptedCount > 0 && tripType !== 'duo' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={acceptedCount > 0 ? "Cannot change type with accepted participants" : ""}
              >
                Duo Trip
              </button>
              <button
                type="button"
                disabled={acceptedCount > 0}
                onClick={() => setTripType('group')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  tripType === 'group' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                } ${acceptedCount > 0 && tripType !== 'group' ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={acceptedCount > 0 ? "Cannot change type with accepted participants" : ""}
              >
                Group Trip
              </button>
            </div>
          )}

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
                      {[...Array(19)].map((_, i) => {
                        const val = i + 2
                        const isDisabled = val < acceptedCount + 1
                        return (
                          <option key={val} value={val} disabled={isDisabled}>
                            {val} People {isDisabled ? '(Current minimum)' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender Preference</label>
                  <select value={genderPreference} onChange={e => setGenderPreference(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 outline-none bg-white">
                    <option value="any">Open to All</option>
                    <option value="male_only">Male Only</option>
                    <option value="female_only">Female Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 resize-none outline-none" placeholder="What are you planning to do on this trip?"></textarea>
              </div>
            </div>
          </div>

          {/* Section 2: Matching Preferences (Only for Unified Trips Table) */}
          {!isGroupTable && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2 mb-6">Matching Preferences</h2>
              <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-70 text-lg"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
