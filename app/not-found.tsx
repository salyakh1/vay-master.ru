import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center px-4 pb-20">
      <div className="max-w-sm w-full text-center">
        <div className="text-6xl mb-4" aria-hidden>
          🔧
        </div>
        <h1 className="text-2xl font-extrabold text-[#1c1c1e] mb-2">Страница не найдена</h1>
        <p className="text-sm text-[#8e8e93] mb-6 leading-relaxed">
          Такой страницы нет или она была удалена. Проверьте адрес или вернитесь на главную.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="block bg-brand-accent text-white text-sm font-bold py-3 rounded-xl"
          >
            На главную
          </Link>
          <Link
            href="/search"
            className="block bg-white text-brand-accent text-sm font-bold py-3 rounded-xl border border-[#e5e5ea]"
          >
            Найти мастера
          </Link>
        </div>
      </div>
    </div>
  )
}
