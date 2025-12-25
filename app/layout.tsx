import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import ProblemEntryModal from '@/components/ProblemEntryModal'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

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
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <ProblemEntryModal />
        </Providers>
      </body>
    </html>
  )
}


