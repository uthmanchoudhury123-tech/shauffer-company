import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Set VAPID details inside the handler so env vars are available at runtime
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  // Only company admins can trigger pushes
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'company_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { driverId, title, body, url } = await req.json()
  if (!driverId || !title) {
    return NextResponse.json({ error: 'Missing driverId or title' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('driver_id', driverId)

  if (!subs || subs.length === 0) {
    // Driver hasn't enabled notifications — silently succeed
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const payload = JSON.stringify({ title, body, url: url ?? '/dashboard/driver/jobs' })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  )

  // Clean up expired/invalid subscriptions (410 Gone)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i]
      return r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410
    })
    .map(s => s.endpoint)

  if (expiredEndpoints.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  const sent = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ ok: true, sent })
}
