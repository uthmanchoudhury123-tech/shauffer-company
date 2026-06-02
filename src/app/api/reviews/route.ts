import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { jobId, driverId, rating, comment } = await req.json()
  if (!jobId || !driverId || !rating) {
    return NextResponse.json({ error: 'jobId, driverId, and rating are required' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Insert review
  const { error: reviewError } = await admin.from('job_reviews').upsert({
    job_id: jobId,
    reviewer_id: user.id,
    driver_id: driverId,
    rating,
    comment: comment?.trim() || null,
  }, { onConflict: 'job_id,reviewer_id' })

  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 })

  // Recalculate driver's average rating
  const { data: reviews } = await admin
    .from('job_reviews')
    .select('rating')
    .eq('driver_id', driverId)

  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    await admin
      .from('drivers')
      .update({ rating: Math.round(avg * 10) / 10, rating_count: reviews.length })
      .eq('id', driverId)
  }

  return NextResponse.json({ success: true })
}
