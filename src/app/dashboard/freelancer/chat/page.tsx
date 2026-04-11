import { createClient } from '@/lib/supabase/server'
import { ChatClient } from './ChatClient'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rooms } = await supabase
    .from('chat_rooms')
    .select(`
      id, created_at, job_id,
      job:freelancer_jobs(id, pickup_address, dropoff_address, job_date, status),
      poster:drivers!chat_rooms_poster_id_fkey(id, full_name),
      driver:drivers!chat_rooms_driver_id_fkey(id, full_name)
    `)
    .or(`poster_id.eq.${user!.id},driver_id.eq.${user!.id}`)
    .order('created_at', { ascending: false })

  return <ChatClient rooms={(rooms ?? []) as any} currentUserId={user!.id} />
}
