'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { FiShield, FiStar, FiMessageCircle } from 'react-icons/fi'

const BENEFITS = [
  { icon: FiStar, text: 'Реальные отзывы после заказов' },
  { icon: FiMessageCircle, text: 'Чат с мастером напрямую' },
  { icon: FiShield, text: 'Модерация профилей' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          setError('Email не подтвержден. Проверьте почту или отключите требование в Supabase.')
        } else {
          throw error
        }
        return
      }

      if (data.user) {
        router.push(returnTo.startsWith('/') ? returnTo : '/')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : ''
      if (msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('ERR_')) {
        const isLocal = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.origin)
        setError(
          isLocal
            ? 'Нет связи с Supabase с localhost. Проверьте антивирус или фаервол.'
            : 'Нет связи с сервером. Проверьте интернет и доступ к Supabase.'
        )
      } else {
        setError(msg || 'Ошибка при входе')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      <div className="bg-brand-accent px-4 pt-10 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-3">
          <span className="text-2xl" aria-hidden>
            🔧
          </span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">
          VAY<span className="opacity-80">–</span>MASTER
        </h1>
        <p className="text-white/80 text-sm">Мастера, материалы и заказы в одном месте</p>
      </div>

      <div className="flex-1 px-4 -mt-4 pb-8">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-sm max-w-md mx-auto">
          <h2 className="text-lg font-bold text-[#1c1c1e] mb-4 text-center">Вход в аккаунт</h2>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input w-full"
                placeholder="example@mail.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input w-full"
                placeholder="Введите пароль"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-[#fdf0f0] border border-[#f5c6cb] text-brand-accent px-3 py-2.5 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn btn-primary py-3 font-bold">
              {loading ? 'Вход…' : 'Войти'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[#8e8e93]">
            Нет аккаунта?{' '}
            <Link href="/auth/register" className="text-brand-accent font-semibold">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <ul className="max-w-md mx-auto mt-5 space-y-2.5 px-1">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-sm text-[#555]">
              <span className="w-8 h-8 rounded-lg bg-white border border-[#e5e5ea] flex items-center justify-center text-brand-accent shrink-0">
                <Icon size={15} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-[#8e8e93] hover:text-[#1c1c1e]">
            ← На главную без входа
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
          <div className="text-[#8e8e93]">Загрузка…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
