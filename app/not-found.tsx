import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl mb-4">🔧</p>
      <h1 className="text-2xl font-semibold mb-2">Страница не найдена</h1>
      <p className="text-gray-500 mb-6">
        Возможно, ссылка устарела или страница была удалена
      </p>
      <Link
        href="/"
        className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium"
      >
        На главную
      </Link>
    </div>
  )
}
