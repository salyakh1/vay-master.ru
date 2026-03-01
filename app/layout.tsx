import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VayMaster - Социальная сеть для мастеров и продавцов',
  description: 'Платформа для строителей, автомехаников и продавцов строительных материалов',
  icons: {
    icon: '/icon.jpg',
    apple: '/apple-icon.jpg',
  },
}

/** Фиксированный масштаб: страница не увеличивается и не уменьшается (нет авто-зума). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans flex flex-col min-h-screen`} suppressHydrationWarning>
        <Providers>
          <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}


