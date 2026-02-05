// Этот layout исключает страницу входа из проверки авторизации админ-панели
export const dynamic = 'force-dynamic'

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

