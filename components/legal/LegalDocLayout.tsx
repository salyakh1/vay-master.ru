'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { LEGAL_LINKS, LEGAL_OPERATOR } from '@/lib/legalOperator'

const NAV = [
  { href: LEGAL_LINKS.privacy, label: 'Конфиденциальность' },
  { href: LEGAL_LINKS.terms, label: 'Соглашение' },
  { href: LEGAL_LINKS.offer, label: 'Оферта' },
  { href: LEGAL_LINKS.rules, label: 'Правила' },
] as const

export default function LegalDocLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="card">
            <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight mb-2">{title}</h1>
            <p className="text-sm text-text-secondary">
              Редакция от {LEGAL_OPERATOR.docsUpdatedAt} · {LEGAL_OPERATOR.appName} · {LEGAL_OPERATOR.country}
            </p>
            <nav className="mt-4 flex flex-wrap gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border-light text-text-secondary hover:text-brand-accent hover:border-brand-accent/40"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="card space-y-5 text-text-secondary leading-relaxed text-[15px]">{children}</div>
          <p className="text-xs text-text-muted px-1">
            Документ носит информационный характер и подготовлен с учётом требований законодательства РФ
            (включая 152-ФЗ). Перед коммерческим запуском рекомендуется проверка юристом. Реквизиты оператора
            необходимо заполнить в настройках проекта.
          </p>
        </div>
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-graphite-secondary tracking-tight">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
