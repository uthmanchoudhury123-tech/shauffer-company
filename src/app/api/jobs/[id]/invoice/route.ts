import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const admin = createAdminClient()

  // Fetch job with driver and company
  const { data: job, error } = await admin
    .from('jobs')
    .select(`
      *,
      driver:drivers(full_name, car_type),
      company:companies(name, logo_url, email, phone, address)
    `)
    .eq('id', id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const company = (job.company as any) ?? {}
  const driver  = (job.driver  as any) ?? {}

  const invoiceNumber = `INV-${job.id.slice(0, 8).toUpperCase()}`
  const invoiceDate   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const jobDate       = job.job_date
    ? new Date(job.job_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const price    = Number(job.price ?? 0)
  const vatRate  = 0.20
  const subtotal = price
  const vat      = +(subtotal * vatRate).toFixed(2)
  const total    = +(subtotal + vat).toFixed(2)

  const stops: string[] = job.route_legs?.length >= 2
    ? job.route_legs
    : [job.pickup_address, job.dropoff_address].filter(Boolean)

  const routeHtml = stops.map((stop: string, i: number) => `
    <div class="route-stop">
      <div class="stop-dot ${i === 0 ? 'dot-green' : i === stops.length - 1 ? 'dot-red' : 'dot-blue'}"></div>
      <span>${stop ?? '—'}</span>
    </div>
  `).join('<div class="route-line"></div>')

  const logoHtml = company.logo_url
    ? `<img src="${company.logo_url}" alt="${company.name}" class="company-logo" />`
    : `<div class="company-logo-placeholder">${(company.name ?? 'C').charAt(0).toUpperCase()}</div>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f6fa;
      color: #1a1a2e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      max-width: 760px;
      margin: 40px auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      padding: 36px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      color: #fff;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .company-logo {
      width: 56px; height: 56px; border-radius: 12px;
      object-fit: contain; background: #fff; padding: 4px;
    }
    .company-logo-placeholder {
      width: 56px; height: 56px; border-radius: 12px;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; color: #fff;
    }
    .company-name { font-size: 20px; font-weight: 700; }
    .company-sub  { font-size: 12px; opacity: 0.75; margin-top: 2px; }
    .header-right { text-align: right; }
    .invoice-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.7; }
    .invoice-number { font-size: 26px; font-weight: 800; margin-top: 2px; }
    .invoice-date { font-size: 13px; opacity: 0.8; margin-top: 4px; }

    /* ── Status badge ── */
    .status-bar {
      padding: 10px 40px;
      background: #f8faff;
      border-bottom: 1px solid #e8edf5;
      display: flex;
      gap: 12px;
      align-items: center;
      font-size: 13px;
    }
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .badge-completed { background: #dcfce7; color: #166534; }
    .badge-pending   { background: #fef9c3; color: #854d0e; }
    .badge-assigned  { background: #dbeafe; color: #1e40af; }

    /* ── Body ── */
    .body { padding: 36px 40px; }

    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1.2px; color: #6b7280; margin-bottom: 12px;
      padding-bottom: 8px; border-bottom: 1px solid #f0f2f7;
    }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    .info-card {
      background: #f8faff;
      border: 1px solid #e8edf5;
      border-radius: 10px;
      padding: 16px;
    }
    .info-label { font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #111827; }
    .info-sub   { font-size: 12px; color: #6b7280; margin-top: 2px; }

    /* ── Route ── */
    .route-container { display: flex; flex-direction: column; gap: 0; }
    .route-stop {
      display: flex; align-items: center; gap: 12px;
      font-size: 13px; color: #374151; padding: 8px 0;
    }
    .stop-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .dot-green { background: #22c55e; }
    .dot-red   { background: #ef4444; }
    .dot-blue  { background: #3b82f6; }
    .route-line {
      width: 2px; height: 14px; background: #e5e7eb;
      margin-left: 4px;
    }

    /* ── Pricing table ── */
    .price-table { width: 100%; border-collapse: collapse; }
    .price-table th {
      text-align: left; font-size: 11px; text-transform: uppercase;
      letter-spacing: 1px; color: #9ca3af; padding: 8px 12px;
      background: #f8faff; border-bottom: 1px solid #e8edf5;
    }
    .price-table td {
      padding: 12px; font-size: 14px; color: #374151;
      border-bottom: 1px solid #f3f4f6;
    }
    .price-table tr:last-child td { border-bottom: none; }
    .price-table .text-right { text-align: right; font-weight: 600; }

    .totals {
      margin-top: 16px;
      border-top: 2px solid #e8edf5;
      padding-top: 12px;
    }
    .total-row {
      display: flex; justify-content: space-between;
      padding: 5px 12px; font-size: 14px; color: #6b7280;
    }
    .total-row.grand {
      font-size: 17px; font-weight: 800; color: #111827;
      background: #f0f6ff; border-radius: 8px; padding: 10px 12px;
      margin-top: 8px;
    }

    /* ── Footer ── */
    .footer {
      background: #f8faff;
      border-top: 1px solid #e8edf5;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer strong { color: #6b7280; }

    /* ── Print button ── */
    .print-bar {
      max-width: 760px;
      margin: 0 auto 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      padding: 10px 20px; border-radius: 8px; font-size: 14px;
      font-weight: 600; cursor: pointer; border: none;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db; }

    /* ── Print styles ── */
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; border-radius: 0; }
      .print-bar { display: none; }
    }
  </style>
</head>
<body>

  <!-- Print / Download bar -->
  <div class="print-bar">
    <button class="btn btn-outline" onclick="window.close()">✕ Close</button>
    <button class="btn btn-primary" onclick="window.print()">⬇ Save as PDF</button>
  </div>

  <div class="page">

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${logoHtml}
        <div>
          <div class="company-name">${company.name ?? 'Company'}</div>
          <div class="company-sub">${company.email ?? ''}</div>
          <div class="company-sub">${company.phone ?? ''}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-label">Invoice</div>
        <div class="invoice-number">${invoiceNumber}</div>
        <div class="invoice-date">Issued: ${invoiceDate}</div>
      </div>
    </div>

    <!-- Status bar -->
    <div class="status-bar">
      <span>Job Date: <strong>${jobDate}</strong></span>
      <span>·</span>
      <span>Time: <strong>${job.job_time ?? '—'}</strong></span>
      <span>·</span>
      <span class="status-badge ${
        job.status === 'completed' ? 'badge-completed' :
        job.status === 'assigned'  ? 'badge-assigned'  : 'badge-pending'
      }">
        ● ${(job.status ?? 'pending').charAt(0).toUpperCase() + (job.status ?? 'pending').slice(1)}
      </span>
    </div>

    <div class="body">

      <!-- Job + Driver info -->
      <div class="section">
        <div class="section-title">Job Details</div>
        <div class="two-col">
          <div class="info-card">
            <div class="info-label">Job Type</div>
            <div class="info-value">${job.job_type === 'daily' ? 'Daily Hire' : 'Standard Transfer'}</div>
            ${job.job_type === 'daily' ? `<div class="info-sub">${job.number_of_days ?? 1} day(s) × ${job.hours_per_day ?? '—'} hrs/day</div>` : ''}
          </div>
          <div class="info-card">
            <div class="info-label">Assigned Driver</div>
            <div class="info-value">${driver.full_name ?? 'Unassigned'}</div>
            <div class="info-sub">${driver.car_type ? driver.car_type.charAt(0).toUpperCase() + driver.car_type.slice(1) : ''}</div>
          </div>
          ${job.preferred_car_model ? `
          <div class="info-card">
            <div class="info-label">Vehicle</div>
            <div class="info-value">${job.preferred_car_model}</div>
          </div>` : ''}
          ${job.notes ? `
          <div class="info-card">
            <div class="info-label">Notes</div>
            <div class="info-value" style="font-weight:400;font-size:13px">${job.notes}</div>
          </div>` : ''}
        </div>
      </div>

      <!-- Route -->
      <div class="section">
        <div class="section-title">Route</div>
        <div class="info-card">
          <div class="route-container">${routeHtml}</div>
        </div>
      </div>

      <!-- Pricing -->
      <div class="section">
        <div class="section-title">Pricing</div>
        <table class="price-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${job.job_type === 'daily' ? `Daily Hire — ${job.number_of_days ?? 1} day(s)` : 'Transfer Service'}</td>
              <td class="text-right">£${subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>£${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>VAT (20%)</span>
            <span>£${vat.toFixed(2)}</span>
          </div>
          <div class="total-row grand">
            <span>Total Due</span>
            <span>£${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <div><strong>${company.name ?? ''}</strong>${company.address ? ' · ' + company.address : ''}</div>
      <div>${invoiceNumber} · Generated ${invoiceDate}</div>
    </div>

  </div>

</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
