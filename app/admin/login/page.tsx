'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import Link from 'next/link'
import { FiShield, FiMail, FiLock } from 'react-icons/fi'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Проверяем, не авторизован ли уже пользователь
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const userIsAdmin = await isAdmin(session.user.id)
          if (userIsAdmin) {
            router.push('/admin')
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        // Игнорируем ошибки при проверке
      }
    }
    checkAuth()
  }, [])

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
          setError('Email не подтвержден. Пожалуйста, проверьте почту и подтвердите email.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Неверный email или пароль')
        } else {
          setError(error.message)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Проверяем, является ли пользователь администратором
        const userIsAdmin = await isAdmin(data.user.id)
        
        if (!userIsAdmin) {
          await supabase.auth.signOut()
          setError('У вас нет прав доступа к админ-панели')
          setLoading(false)
          return
        }

        // Перенаправляем в админ-панель
        router.push('/admin')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка при входе')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e] py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-accent rounded-[10px] mb-4">
            <FiShield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1 tracking-tight">
            VAY<span className="text-brand-accent">–</span>MASTER
          </h1>
          <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-widest">Admin Panel</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10 w-full"
                  placeholder="admin@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                Пароль
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pl-10 w-full"
                  placeholder="Введите пароль"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Вход...</span>
                </>
              ) : (
                <>
                  <FiShield size={18} />
                  <span>Войти в админ-панель</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#e5e5ea]">
            <Link href="/" className="block text-center text-sm text-[#8e8e93] hover:text-[#1c1c1e] transition-colors">
              Вернуться на сайт
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#6d6d72]">Доступ только для администраторов</p>
      </div>
    </div>
  )
}

