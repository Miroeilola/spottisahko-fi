import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { GoogleAdSense } from '@/components/analytics/adsense'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SpottiSähkö.fi - Sähkön pörssihinta reaaliajassa',
  description: 'Seuraa sähkön pörssihintaa reaaliajassa. Näe päivän halvimmat tunnit ja säästä sähkölaskussa.',
  keywords: ['sähkön hinta', 'pörssisähkö', 'sähkölaskuri', 'sähkön spot-hinta'],
  authors: [{ name: 'SpottiSähkö.fi' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'SpottiSähkö.fi - Sähkön pörssihinta reaaliajassa',
    description: 'Seuraa sähkön pörssihintaa reaaliajassa. Näe päivän halvimmat tunnit ja säästä sähkölaskussa.',
    type: 'website',
    locale: 'fi_FI',
    siteName: 'SpottiSähkö.fi',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fi">
      <body className={inter.className}>
        {children}
        <GoogleAnalytics />
        <GoogleAdSense />
      </body>
    </html>
  )
}