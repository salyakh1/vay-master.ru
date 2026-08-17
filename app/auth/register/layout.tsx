import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Регистрация',
  description: 'Создайте аккаунт клиента, мастера или продавца на VayMaster — мастера и материалы рядом.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
