import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import { SocialLinks } from '@/components/layout/SocialLinks'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hibra — DEX Aggregator on Base',
  description: 'Find the best swap rates across Uniswap V3, Aerodrome, SushiSwap and PancakeSwap on Base network.',
  keywords: ['DEX', 'aggregator', 'Base', 'Uniswap', 'Aerodrome', 'SushiSwap', 'swap', 'Hibra'],
  openGraph: {
    title: 'Hibra — DEX Aggregator on Base',
    description: 'Find the best swap rates across multiple DEXes on Base network.',
    type: 'website',
  },
  other: {
    'base:app_id': '6a1c9e00187465dabfbce57e',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col" style={{ background: 'var(--bg-main)' }}>
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <SocialLinks />
        </Providers>
      </body>
    </html>
  )
}
