'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendConnectionRequest(receiverId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('connections')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending'
    })

  if (error) {
    console.error('Error sending connection request:', error)
    return { error: error.message }
  }

  revalidatePath('/explore')
  return { success: true }
}
