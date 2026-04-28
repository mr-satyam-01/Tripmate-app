'use server'

import { createClient } from '@/lib/supabase/server'

export async function requestToJoinDuoTrip(tripId: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if a request already exists
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
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred' }
  }
}

export async function acceptJoinRequest(requestId: string, tripId: string, requesterId: string, isGroup: boolean = false, maxMembers: number = 2) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const requestsTable = isGroup ? 'trip_requests' : 'duo_trip_requests'

    // 1. Accept the specific request
    const { error: acceptError } = await supabase
      .from(requestsTable)
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('trip_id', tripId)

    if (acceptError) throw acceptError

    if (isGroup) {
      // Check current accepted count
      const { count, error: countError } = await supabase
        .from(requestsTable)
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId)
        .eq('status', 'accepted')

      if (countError) throw countError

      // +1 for creator, so max accepted requesters is maxMembers - 1
      if (count !== null && count >= maxMembers - 1) {
        await supabase
          .from(requestsTable)
          .update({ status: 'rejected' })
          .eq('trip_id', tripId)
          .eq('status', 'pending')
      }
    } else {
      // 2. Reject all other pending requests for this trip
      await supabase
        .from(requestsTable)
        .update({ status: 'rejected' })
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .neq('id', requestId)

      // 3. Create a connection for the chat
      const { error: connectionError } = await supabase
        .from('connections')
        .insert({
          sender_id: requesterId,
          receiver_id: user.id,
          status: 'accepted'
        })

      if (connectionError) throw connectionError
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred' }
  }
}

export async function rejectJoinRequest(requestId: string, isGroup: boolean = false) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const requestsTable = isGroup ? 'trip_requests' : 'duo_trip_requests'

    const { error } = await supabase
      .from(requestsTable)
      .update({ status: 'rejected' })
      .eq('id', requestId)

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred' }
  }
}

export async function removeParticipant(requestId: string, tripId: string, requesterId: string, isGroup: boolean = false) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const requestsTable = isGroup ? 'trip_requests' : 'duo_trip_requests'

    // Verify ownership (optional but recommended: only the trip creator should be able to remove)
    // We trust the frontend to only show the button to the creator, but could double check DB here.
    
    // 1. Mark request as rejected (which effectively removes them and opens the spot)
    const { error } = await supabase
      .from(requestsTable)
      .update({ status: 'rejected' })
      .eq('id', requestId)
      .eq('status', 'accepted') // Only remove if currently accepted

    if (error) throw error

    // 2. If it's a duo trip, we must remove/reject the connection to block chat access
    if (!isGroup) {
      // Find and delete the connection between creator (user.id) and requesterId
      await supabase
        .from('connections')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${requesterId}),and(sender_id.eq.${requesterId},receiver_id.eq.${user.id})`)
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred' }
  }
}
