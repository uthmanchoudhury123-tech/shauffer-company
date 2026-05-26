import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessagesPage } from '@/components/ui/MessagesPage'

export default async function DriverMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <MessagesPage
      currentUserId={user.id}
      currentUserName={profile?.full_name ?? 'Driver'}
    />
  )
}
