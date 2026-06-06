import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Invoice HTML email template ──────────────────────────────
function buildInvoiceHtml(params: {
  invoiceNumber: string
  companyName: string
  clientName: string
  clientEmail: string
  jobDate: string
  jobTime: string
  pickupAddress: string
  dropoffAddress: string
  driverName: string | null
  amount: number
  vatRate: number
  issuedDate: string
  dueDate: string
}) {
  const { invoiceNumber, companyName, clientName, jobDate, jobTime,
    pickupAddress, dropoffAddress, driverName, amount, vatRate,
    issuedDate, dueDate } = params

  const vatAmount = amount * (vatRate / 100)
  const total = amount + vatAmount
  const fmt = (n: number) => `£${n.toFixed(2)}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:32px;color:#fff;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-size:20px;font-weight:bold;margin:0;">${companyName}</p>
                </td>
                <td align="right">
                  <p style="font-size:22px;font-weight:bold;margin:0;letter-spacing:2px;">INVOICE</p>
                  <p style="font-size:13px;color:#9ca3af;margin:4px 0 0;">${invoiceNumber}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bill To + Dates -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <p style="font-size:11px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Bill To</p>
                  <p style="font-size:15px;font-weight:600;color:#111827;margin:0;">${clientName}</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <p style="font-size:12px;color:#6b7280;margin:0;">Issue Date: <strong style="color:#111827;">${issuedDate}</strong></p>
                  <p style="font-size:12px;color:#6b7280;margin:6px 0 0;">Due Date: <strong style="color:#111827;">${dueDate}</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Job Details -->
        <tr>
          <td style="padding:0 32px 16px;">
            <table width="100%" cellpadding="12" cellspacing="0" style="background:#eff6ff;border-radius:10px;">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;color:#1e40af;">
                    <strong>Date:</strong> ${jobDate} at ${jobTime} &nbsp;|&nbsp;
                    <strong>From:</strong> ${pickupAddress.split(',')[0]} &nbsp;|&nbsp;
                    <strong>To:</strong> ${dropoffAddress.split(',')[0]}
                    ${driverName ? ` &nbsp;|&nbsp; <strong>Driver:</strong> ${driverName}` : ''}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Line Item -->
        <tr>
          <td style="padding:0 32px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr style="border-bottom:1px solid #e5e7eb;">
                <th align="left" style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;">Description</th>
                <th align="right" style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;">Amount</th>
              </tr>
              <tr>
                <td style="padding:12px 0;font-size:14px;color:#374151;">
                  Chauffeur Service — ${pickupAddress.split(',')[0]} to ${dropoffAddress.split(',')[0]}
                </td>
                <td align="right" style="padding:12px 0;font-size:14px;color:#111827;font-weight:600;">${fmt(amount)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Totals -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table align="right" cellpadding="4" cellspacing="0" style="width:240px;">
              <tr>
                <td style="font-size:13px;color:#6b7280;">Subtotal</td>
                <td align="right" style="font-size:13px;color:#374151;">${fmt(amount)}</td>
              </tr>
              ${vatRate > 0 ? `<tr>
                <td style="font-size:13px;color:#6b7280;">VAT (${vatRate}%)</td>
                <td align="right" style="font-size:13px;color:#374151;">${fmt(vatAmount)}</td>
              </tr>` : ''}
              <tr style="border-top:2px solid #111827;">
                <td style="font-size:16px;font-weight:bold;color:#111827;padding-top:8px;">Total</td>
                <td align="right" style="font-size:16px;font-weight:bold;color:#111827;padding-top:8px;">${fmt(total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">Thank you for your business — ${companyName}</p>
            <p style="font-size:11px;color:#d1d5db;margin:4px 0 0;">Powered by Chauffex</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Route handler ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { jobId, vatRate = 0, sendEmail = true } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Fetch job
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Reuse existing invoice number if already generated
    let invoiceNumber: string = job.invoice_number

    if (!invoiceNumber) {
      // Count existing invoices for this company (or global for freelancers)
      const companyFilter = job.company_id
        ? { company_id: job.company_id }
        : { created_by: job.created_by }

      let query = supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .not('invoice_number', 'is', null)

      if (job.company_id) {
        query = query.eq('company_id', job.company_id)
      } else {
        query = query.eq('created_by', job.created_by)
      }

      const { count } = await query
      const seq = String((count ?? 0) + 1).padStart(4, '0')
      invoiceNumber = `INV-${new Date().getFullYear()}-${seq}`

      // Save invoice number to DB
      await supabase
        .from('jobs')
        .update({ invoice_number: invoiceNumber })
        .eq('id', jobId)
    }

    // Fetch company for email sender details
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, company_id')
      .eq('id', user.id)
      .single()

    const { data: company } = profile?.company_id
      ? await supabase
          .from('companies')
          .select('name, email, logo_url')
          .eq('id', profile.company_id)
          .single()
      : { data: null }

    const companyName = company?.name ?? profile?.full_name ?? 'Chauffex'

    // Fetch driver name
    let driverName: string | null = null
    if (job.driver_id) {
      const { data: driver } = await supabase
        .from('drivers')
        .select('full_name')
        .eq('id', job.driver_id)
        .single()
      driverName = driver?.full_name ?? null
    }

    // Send email via Resend if API key is set and client email exists
    let emailSent = false
    const resendKey = process.env.RESEND_API_KEY
    const clientEmail = job.client_email

    if (sendEmail && resendKey && clientEmail) {
      const issuedDate = new Date().toLocaleDateString('en-GB')
      const dueDate = new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB')
      const amount = job.client_price ?? job.price ?? 0

      const html = buildInvoiceHtml({
        invoiceNumber,
        companyName,
        clientName: job.client_name ?? 'Client',
        clientEmail,
        jobDate: job.job_date,
        jobTime: job.job_time,
        pickupAddress: job.pickup_address,
        dropoffAddress: job.dropoff_address,
        driverName,
        amount,
        vatRate,
        issuedDate,
        dueDate,
      })

      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'invoices@chauffex.app'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${companyName} <${fromEmail}>`,
          to: clientEmail,
          subject: `Invoice ${invoiceNumber} from ${companyName}`,
          html,
        }),
      })

      if (res.ok) {
        emailSent = true
        await supabase
          .from('jobs')
          .update({ invoice_sent_at: new Date().toISOString() })
          .eq('id', jobId)
      }
    }

    return NextResponse.json({ invoiceNumber, emailSent })

  } catch (err: any) {
    console.error('Invoice generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
