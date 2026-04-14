import Stripe from 'stripe'

// Lazily initialised so the module can be imported at build time
// without STRIPE_SECRET_KEY being present in the environment.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
      stripeAccount: process.env.STRIPE_ACCOUNT_ID,
    })
  }
  return _stripe
}

// Backwards-compatible named export — resolves at call time, not import time
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
