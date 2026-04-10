import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { PWARegister } from '@/components/PWARegister'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '[PLATFORM] — Fleet & Driver Management',
  description: 'Professional fleet and driver management for modern transport companies.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '[PLATFORM]',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
