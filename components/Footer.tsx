'use client'

import Link from 'next/link'
import AdSlot from './AdSlot'
import { LEGAL_LINKS } from '@/lib/legalOperator'

export default function Footer() {
  return (
    <footer className="border-t border-border-color bg-bg-primary py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <AdSlot
            type="FOOTER_BRAND"
            context={{ page: 'home' }}
            className="flex items-center gap-2"
          />
        </div>
        <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-text-secondary">
          <Link href={LEGAL_LINKS.privacy} className="hover:text-brand-accent">
            Конфиденциальность
          </Link>
          <Link href={LEGAL_LINKS.terms} className="hover:text-brand-accent">
            Соглашение
          </Link>
          <Link href={LEGAL_LINKS.offer} className="hover:text-brand-accent">
            Оферта
          </Link>
          <Link href={LEGAL_LINKS.rules} className="hover:text-brand-accent">
            Правила
          </Link>
          <a href="mailto:support@vay-master.ru" className="hover:text-brand-accent">
            Поддержка
          </a>
        </nav>
        <div className="text-center text-xs text-text-secondary mt-3">
          © {new Date().getFullYear()} VAY-MASTER. Все права защищены.
        </div>
      </div>
    </footer>
  )
}
