import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chauffex',
    short_name: 'Chauffex',
    description: 'Chauffeur fleet management — jobs, dispatch, and driver tools.',
    start_url: '/auth/login',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
