import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import twilio from 'twilio'

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return phone.replace(/\s/g, '')
  if (digits.startsWith('44')) return `+${digits}`
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`
  return `+${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken  = process.env.TWILIO_AUTH_TOKEN
    const verifySid  = process.env.TWILIO_VERIFY_SID

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'SMS not configured' }, { status: 503 })
    }

    const formattedPhone = formatPhone(phone)

    if (verifySid) {
      // ── Twilio Verify ────────────────────────────────────────────────────────
      const client = twilio(accountSid, authToken)
      const check = await client.verify.v2.services(verifySid).verificationChecks.create({
        to: formattedPhone,
        code,
      })

      if (check.status !== 'approved') {
        return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
      }
    } else {
      // ── Fallback: check against Supabase ────────────────────────────────────
      const admin = createAdminClient()
      const { data: record } = await admin
        .from('sms_verifications')
        .select('code, expires_at, verified')
        .eq('phone', formattedPhone)
        .single()

      if (!record) return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
      if (record.verified) return NextResponse.json({ verified: true }) // already done
      if (new Date(record.expires_at) < new Date()) return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
      if (record.code !== code) return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })

      // Mark verified
      await admin.from('sms_verifications').update({ verified: true }).eq('phone', formattedPhone)
    }

    // Save verified phone to the user's profile and driver record
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      await Promise.all([
        admin.from('user_profiles').update({ phone: formattedPhone, phone_verified: true }).eq('id', user.id),
        admin.from('drivers').update({ phone: formattedPhone, phone_verified: true }).eq('id', user.id),
      ])
    }

    return NextResponse.json({ verified: true })
  } catch (err: any) {
    console.error('SMS verify error:', err)
    return NextResponse.json({ error: err.message ?? 'Verification failed' }, { status: 500 })
  }
}
