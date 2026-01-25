import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'
import { Providers } from './providers'
import Footer from '@/components/Footer'

// Dynamic import для модального окна - загружается только на главной странице
const ProblemEntryModal = dynamic(() => import('@/components/ProblemEntryModal'), {
  ssr: false,
})

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
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <ProblemEntryModal />
        </Providers>
      </body>
    </html>
  )
}


