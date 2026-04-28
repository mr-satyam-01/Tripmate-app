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
