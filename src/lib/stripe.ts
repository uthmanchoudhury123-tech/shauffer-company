import Stripe from 'stripe'

// Single Stripe instance used across all API routes
// STRIPE_ACCOUNT_ID is required when using an Organisation-level API key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  stripeAccount: process.env.STRIPE_ACCOUNT_ID,
})
