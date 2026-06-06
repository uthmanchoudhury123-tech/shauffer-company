import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import twilio from 'twilio'

// ── Twilio Verify (recommended) or SMS fallback ──────────────────────────────
// Uses Twilio Verify if TWILIO_VERIFY_SID is set, otherwise sends a raw SMS
// with a code stored in Supabase.

function formatPhone(phone: string): string {
  // Normalise to E.164 — assumes UK (+44) if no country code
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return phone.replace(/\s/g, '')
  if (digits.startsWith('44')) return `+${digits}`
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`
  return `+${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken  = process.env.TWILIO_AUTH_TOKEN
    const verifySid  = process.env.TWILIO_VERIFY_SID    // Twilio Verify service SID (preferred)
    const fromNumber = process.env.TWILIO_PHONE_NUMBER  // fallback if no Verify SID

    if (!accountSid || !authToken) {
      return NextResponse.json({
        error: 'SMS not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to your environment variables.',
      }, { status: 503 })
    }

    const formattedPhone = formatPhone(phone)
    const client = twilio(accountSid, authToken)

    if (verifySid) {
      // ── Twilio Verify (handles rate-limiting, code management, expiry) ──────
      await client.verify.v2.services(verifySid).verifications.create({
        to: formattedPhone,
        channel: 'sms',
      })
    } else if (fromNumber) {
      // ── Fallback: manual 6-digit code stored in Supabase ───────────────────
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

      const admin = createAdminClient()
      await admin.from('sms_verifications').upsert({
        phone: formattedPhone,
        code,
        expires_at: expiresAt,
        verified: false,
      }, { onConflict: 'phone' })

      await client.messages.create({
        to: formattedPhone,
        from: fromNumber,
        body: `Your Chauffex verification code is: ${code}. Valid for 10 minutes.`,
      })
    } else {
      return NextResponse.json({
        error: 'Configure TWILIO_VERIFY_SID or TWILIO_PHONE_NUMBER in your environment variables.',
      }, { status: 503 })
    }

    return NextResponse.json({ sent: true })
  } catch (err: any) {
    console.error('SMS send error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send SMS' }, { status: 500 })
  }
}
