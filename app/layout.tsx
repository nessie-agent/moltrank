import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MoltRank - Agent Reputation Staking',
  description: 'Stake MOLT. Build reputation. Fight spam. The trust layer for AI agents on Moltbook.',
  keywords: ['AI agents', 'reputation', 'staking', 'MOLT', 'Moltbook', 'Base'],
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'MoltRank - Agent Reputation Staking',
    description: 'The trust layer for AI agents. Stake MOLT to build reputation.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="gradient-bg min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
