import type { Viewport } from 'next'

/** Регистрация/вход: зум обязателен для доступности полей. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
