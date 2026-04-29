'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTrip(tripId: string, isGroupTable: boolean, data: any) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

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
  const { data: updateData, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', tripId)
    .eq(ownerCol, user.id)
    .select()

  if (error || !updateData || updateData.length === 0) {
    console.error('Error updating trip:', error)
    return { error: error?.message || 'Update failed - no matching trip or unauthorized' }
  }

  revalidatePath(`/my-trips/${tripId}`)
  revalidatePath('/my-trips')
  revalidatePath('/explore')
  revalidatePath('/group-trips')

  return { success: true }
}

export async function deleteTrip(tripId: string, isGroupTable: boolean) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

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
    requestsTable = 'duo_trip_requests' // All unified trips use duo_trip_requests
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
  const { data: deleteData, error } = await supabase
    .from(table)
    .delete()
    .eq('id', tripId)
    .eq(ownerCol, user.id)
    .select()

  if (error || !deleteData || deleteData.length === 0) {
    console.error('Error deleting trip:', error)
    return { error: error?.message || 'Delete failed - no matching trip or unauthorized' }
  }

  revalidatePath('/my-trips')
  revalidatePath('/explore')
  revalidatePath('/group-trips')

  return { success: true }
}
