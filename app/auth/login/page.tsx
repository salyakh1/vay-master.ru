'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
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
        // Если ошибка связана с неподтвержденным email, показываем понятное сообщение
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          setError('Email не подтвержден. Пожалуйста, проверьте почту и подтвердите email, или отключите требование подтверждения в настройках Supabase.')
        } else {
          throw error
        }
        return
      }

      if (data.user) {
        // После авторизации все пользователи перенаправляются на главную страницу
        router.push('/')
      }
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('ERR_')) {
        const isLocal = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.origin)
        setError(
          isLocal
            ? 'Нет связи с Supabase с localhost. Часто режет антивирус или фаервол — добавьте в исключения или отключите для разработки. В проде при этом может работать.'
            : 'Нет связи с сервером. Проверьте интернет, VPN, антивирус и доступ к Supabase.'
        )
      } else {
        setError(msg || 'Ошибка при входе')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4">
      <div className="max-w-md w-full card">
        <h2 className="text-xl font-bold text-center mb-8 text-black">Вход</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link href="/auth/register" className="text-blue-600 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}

