'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createGroupTrip(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const data = {
    creator_id: user.id,
    destination: formData.get('destination') as string,
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    budget: formData.get('budget') as string,
    description: formData.get('description') as string,
    max_members: parseInt(formData.get('max_members') as string) || 10,
    gender_preference: (formData.get('gender_preference') as string) || 'any',
  }

  const { error } = await supabase.from('group_trips').insert(data)

  if (error) {
    console.error('Error creating group trip:', error)
    return { error: error.message }
  }

  revalidatePath('/group-trips')
  return { success: true }
}

export async function requestToJoinTrip(tripId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch the trip — check both tables since group trips may be in either
  let tripPref: string | null = null

  const { data: legacyTrip } = await supabase
    .from('group_trips')
    .select('gender_preference')
    .eq('id', tripId)
    .single()

  if (legacyTrip) {
    tripPref = legacyTrip.gender_preference
  } else {
    const { data: unifiedTrip } = await supabase
      .from('trips')
      .select('gender_preference')
      .eq('id', tripId)
      .single()

    if (unifiedTrip) {
      tripPref = unifiedTrip.gender_preference
    }
  }

  if (tripPref === null && !legacyTrip) {
    // Neither table had this trip
    const { data: checkUnified } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .single()
    if (!checkUnified) {
      return { error: 'Trip not found' }
    }
    tripPref = 'any'
  }

  const { data: userData } = await supabase
    .from('users')
    .select('gender')
    .eq('id', user.id)
    .single()

  const userGender = userData?.gender?.toLowerCase()
  const pref = tripPref?.toLowerCase() || 'any'

  if (pref === 'male_only' && userGender !== 'male') {
    return { error: 'This trip is restricted to male travelers only.' }
  } else if (pref === 'female_only' && userGender !== 'female') {
    return { error: 'This trip is restricted to female travelers only.' }
  }

  // Check if a request already exists
  const { data: existingRequest } = await supabase
    .from('trip_requests')
    .select('id, status')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single()

  if (existingRequest) {
    if (existingRequest.status === 'pending' || existingRequest.status === 'accepted') {
      return { error: 'Request already sent' }
    } else {
      // If rejected, update to pending (re-request)
      const { error } = await supabase
        .from('trip_requests')
        .update({ status: 'pending' })
        .eq('id', existingRequest.id)
      
      if (error) return { error: error.message }
      revalidatePath('/group-trips')
      return { success: true }
    }
  }

  const { error } = await supabase.from('trip_requests').insert({
    trip_id: tripId,
    user_id: user.id,
    status: 'pending'
  })

  if (error) {
    console.error('Error joining trip:', error)
    return { error: error.message }
  }

  revalidatePath('/group-trips')
  return { success: true }
}
