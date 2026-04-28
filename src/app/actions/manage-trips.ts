'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTrip(tripId: string, isGroupTable: boolean, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Find which table the trip is in
  let table = 'trips'
  let ownerCol = 'user_id'
  
  const { data: existingTrip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single()

  if (!existingTrip) {
    const { data: groupTrip } = await supabase
      .from('group_trips')
      .select('creator_id')
      .eq('id', tripId)
      .single()
      
    if (groupTrip) {
      table = 'group_trips'
      ownerCol = 'creator_id'
    } else {
      return { error: 'Trip not found' }
    }
  }

  // Update trip with strict ownership check
  const { error } = await supabase
    .from(table)
    .update(data)
    .eq('id', tripId)
    .eq(ownerCol, user.id)

  if (error) {
    console.error('Error updating trip:', error)
    return { error: error.message }
  }

  revalidatePath(`/my-trips/${tripId}`)
  revalidatePath('/my-trips')
  revalidatePath('/explore')
  revalidatePath('/group-trips')

  return { success: true }
}

export async function deleteTrip(tripId: string, isGroupTable: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Find which table the trip is in
  let table = 'trips'
  let ownerCol = 'user_id'
  let requestsTable = 'duo_trip_requests' // Default for trips unless it's a group trip in the trips table
  let isGroup = false
  
  const { data: existingTrip } = await supabase
    .from('trips')
    .select('user_id, trip_type')
    .eq('id', tripId)
    .single()

  if (existingTrip) {
    isGroup = existingTrip.trip_type === 'group'
    requestsTable = isGroup ? 'trip_requests' : 'duo_trip_requests'
  } else {
    const { data: groupTrip } = await supabase
      .from('group_trips')
      .select('creator_id')
      .eq('id', tripId)
      .single()
      
    if (groupTrip) {
      table = 'group_trips'
      ownerCol = 'creator_id'
      requestsTable = 'trip_requests'
    } else {
      return { error: 'Trip not found' }
    }
  }

  // To prevent Foreign Key constraint violations if ON DELETE CASCADE isn't set,
  // manually delete dependent records first.
  await supabase.from(requestsTable).delete().eq('trip_id', tripId)
  await supabase.from('messages').delete().eq('trip_id', tripId)

  // Finally, delete the trip itself with strict ownership check
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', tripId)
    .eq(ownerCol, user.id)

  if (error) {
    console.error('Error deleting trip:', error)
    return { error: error.message }
  }

  revalidatePath('/my-trips')
  revalidatePath('/explore')
  revalidatePath('/group-trips')

  return { success: true }
}
