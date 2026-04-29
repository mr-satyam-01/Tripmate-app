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
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    console.log('--- JOIN REQUEST DEBUG ---')
    console.log('Received tripId in action:', tripId)

    // Fetch the trip from unified trips table
    const { data: trip } = await supabase
      .from('trips')
      .select('gender_preference, trip_type, id')
      .eq('id', tripId)
      .single()

    console.log('Database check in trips table for ID:', tripId, 'Found:', trip?.id)

    if (!trip) {
      console.error('Trip not found in trips table for ID:', tripId)
      return { success: false, error: 'Trip not found' }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('gender')
      .eq('id', user.id)
      .single()

    const userGender = userData?.gender?.toLowerCase()
    const pref = trip.gender_preference?.toLowerCase() || 'any'

    if (pref === 'male_only' && userGender !== 'male') {
      return { success: false, error: 'This trip is restricted to male travelers only.' }
    } else if (pref === 'female_only' && userGender !== 'female') {
      return { success: false, error: 'This trip is restricted to female travelers only.' }
    }

    // Reuse duo_trip_requests for unified group trips
    const { data: existingRequest } = await supabase
      .from('duo_trip_requests')
      .select('id, status')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending' || existingRequest.status === 'accepted') {
        return { success: false, error: 'Request already sent' }
      } else {
        // If rejected, update to pending
        const { error } = await supabase
          .from('duo_trip_requests')
          .update({ status: 'pending' })
          .eq('id', existingRequest.id)
        
        if (error) return { success: false, error: error.message }
        revalidatePath('/group-trips')
        return { success: true }
      }
    }

    const { error } = await supabase
      .from('duo_trip_requests')
      .insert({
        trip_id: tripId,
        user_id: user.id,
        status: 'pending'
      })

    if (error) {
      console.error('Error joining trip:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/group-trips')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred' }
  }
}
