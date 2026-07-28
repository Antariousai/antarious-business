import type { Metadata } from 'next'
import { Providers } from '@/components/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'AntariousAI',
  description: 'Freya — your AI teammate for posts, messages, and money.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
