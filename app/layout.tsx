import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import ProblemEntryModal from '@/components/ProblemEntryModal'

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
      <body className={`${inter.variable} ${manrope.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          {children}
          <ProblemEntryModal />
        </Providers>
      </body>
    </html>
  )
}


