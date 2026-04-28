'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTrip(tripId: string, isGroupTable: boolean, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const table = isGroupTable ? 'group_trips' : 'trips'

  // Verify ownership
  const { data: existingTrip, error: fetchError } = await supabase
    .from(table)
    .select('user_id, creator_id')
    .eq('id', tripId)
    .single()

  if (fetchError || !existingTrip) {
    return { error: 'Trip not found' }
  }

  const ownerId = isGroupTable ? existingTrip.creator_id : existingTrip.user_id

  if (ownerId !== user.id) {
    return { error: 'Unauthorized to edit this trip' }
  }

  // Update trip
  const { error } = await supabase
    .from(table)
    .update(data)
    .eq('id', tripId)

  if (error) {
    console.error('Error updating trip:', error)
    return { error: error.message }
  }

  revalidatePath(`/my-trips/${tripId}`)
  revalidatePath('/my-trips')
  revalidatePath('/explore')
  if (isGroupTable) revalidatePath('/group-trips')

  return { success: true }
}

export async function deleteTrip(tripId: string, isGroupTable: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const table = isGroupTable ? 'group_trips' : 'trips'

  // Verify ownership
  const { data: existingTrip, error: fetchError } = await supabase
    .from(table)
    .select('user_id, creator_id')
    .eq('id', tripId)
    .single()

  if (fetchError || !existingTrip) {
    return { error: 'Trip not found' }
  }

  const ownerId = isGroupTable ? existingTrip.creator_id : existingTrip.user_id

  if (ownerId !== user.id) {
    return { error: 'Unauthorized to delete this trip' }
  }

  // To prevent Foreign Key constraint violations if ON DELETE CASCADE isn't set,
  // manually delete dependent records first.
  const requestsTable = isGroupTable ? 'trip_requests' : 'duo_trip_requests'
  
  await supabase.from(requestsTable).delete().eq('trip_id', tripId)
  await supabase.from('messages').delete().eq('trip_id', tripId)

  // Finally, delete the trip itself
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', tripId)

  if (error) {
    console.error('Error deleting trip:', error)
    return { error: error.message }
  }

  revalidatePath('/my-trips')
  revalidatePath('/explore')
  if (isGroupTable) revalidatePath('/group-trips')

  return { success: true }
}
