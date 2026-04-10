import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '[PLATFORM] — Driver',
    short_name: '[PLATFORM]',
    description: 'Your jobs, live location sharing and status — all in one place.',
    start_url: '/dashboard/driver',
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
