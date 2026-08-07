'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AuthBrandHero from '@/components/auth/AuthBrandHero'
import { localizeAuthError } from '@/components/auth/localizeAuthError'

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
      setError(localizeAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full flex flex-col">
      <AuthBrandHero subtitle="Войдите, чтобы писать мастерам, создавать заказы и общаться в чате." />

      <div className="flex-1 px-4 -mt-6 relative z-10 pb-10">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#1c1c1e] mb-1 text-center">Вход в аккаунт</h2>
          <p className="text-center text-xs text-text-secondary mb-5">Добро пожаловать обратно в VAY-MASTER</p>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-text-secondary mb-1.5">
                Email
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="block text-xs font-semibold text-text-secondary mb-1.5">
                Пароль
              </label>
              <input
                id="login-password"
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
              <div
                className="bg-[#fdf0f0] border border-[#f5c6cb] text-brand-accent px-3 py-2.5 rounded-xl text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn btn-primary py-3.5 font-bold text-[15px]">
              {loading ? 'Вход…' : 'Войти'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#8e8e93]">
            Нет аккаунта?{' '}
            <Link href="/auth/register" className="text-brand-accent font-semibold hover:underline">
              Зарегистрироваться бесплатно
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-[#8e8e93] hover:text-[#1c1c1e] transition-colors">
            ← Продолжить без входа
          </Link>
        </p>
      </div>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full">
      <div className="h-72 bg-gradient-to-br from-[#1c1c1e] to-[#8b2e28] animate-pulse" />
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 h-80 animate-pulse" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  )
}
