import { createClient } from '@/lib/supabase/server'
import { DocumentsClient } from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: documents } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', user!.id)
    .order('uploaded_at', { ascending: false })

  return <DocumentsClient documents={documents ?? []} driverId={user!.id} />
}
