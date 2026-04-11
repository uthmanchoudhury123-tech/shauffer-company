import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', user.id)
    .order('uploaded_at', { ascending: false })

  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const doc_type = formData.get('doc_type') as string
  const expiry_date = formData.get('expiry_date') as string | null
  const file = formData.get('file') as File | null
  let file_name = formData.get('file_name') as string
  let file_url: string | null = null

  if (!doc_type) return NextResponse.json({ error: 'Document type is required' }, { status: 400 })

  // Upload to Supabase Storage if file is provided
  if (file && file.size > 0) {
    file_name = file.name
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${doc_type}-${Date.now()}.${ext}`
    const { data: upload, error: uploadErr } = await supabase.storage
      .from('driver-documents')
      .upload(path, file, { upsert: true })

    if (!uploadErr && upload) {
      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(upload.path)
      file_url = urlData.publicUrl
    }
  }

  const { data, error } = await supabase
    .from('driver_documents')
    .insert({
      driver_id: user.id,
      doc_type,
      file_name: file_name || doc_type,
      file_url,
      expiry_date: expiry_date || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ document: data })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 })

  const { error } = await supabase
    .from('driver_documents')
    .delete()
    .eq('id', id)
    .eq('driver_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
