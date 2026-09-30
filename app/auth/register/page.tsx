'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, UserRole } from '@/lib/supabase'
import Link from 'next/link'
import AuthBrandHero from '@/components/auth/AuthBrandHero'
import { localizeAuthError } from '@/components/auth/localizeAuthError'
import { trackFunnel } from '@/lib/track-funnel'
import { FiTool, FiShoppingBag, FiUser } from 'react-icons/fi'
import type { IconType } from 'react-icons'

const VALID_ROLES: UserRole[] = ['master', 'seller', 'client']

const ROLE_META: Record<UserRole, { label: string; icon: IconType }> = {
  master: { label: 'Мастер', icon: FiTool },
  seller: { label: 'Продавец', icon: FiShoppingBag },
  client: { label: 'Клиент', icon: FiUser },
}

function isUserRole(v: string | null): v is UserRole {
  return v != null && VALID_ROLES.includes(v as UserRole)
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const roleParam = searchParams.get('role')
  const role: UserRole | null = isUserRole(roleParam) ? roleParam : null

  useEffect(() => {
    if (!role) router.replace('/auth/start')
  }, [role, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!role) {
      router.replace('/auth/start')
      return
    }
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            phone: phone || null,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        if (!authData.session) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session) {
            console.warn('Session not created after registration, user may need to login')
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500))

        const { data: profileData, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        if (!profileData && !profileCheckError) {
          try {
            const { error: profileError } = await supabase.from('profiles').insert({
              id: authData.user.id,
              email,
              full_name: fullName,
              role,
              phone: phone || null,
            })

            if (profileError) {
              console.error('Profile creation error:', profileError)
            }
          } catch (err: unknown) {
            console.error('Profile creation exception:', err)
          }
        }

        if (!authData.user.email_confirmed_at) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))

        try {
          const { data: { session } } = await supabase.auth.getSession()
          const welcomeResponse = await fetch('/api/welcome-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({}),
          })
          const welcomeData = await welcomeResponse.json()
          if (!welcomeResponse.ok) {
            console.error('[register] Failed to send welcome message:', welcomeData)
          }
        } catch (welcomeError: unknown) {
          console.error('[register] Error sending welcome message:', welcomeError)
        }

        void trackFunnel('register_role', { role })

        router.push('/onboarding')
      }
    } catch (err: unknown) {
      setError(localizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full flex flex-col">
      <AuthBrandHero subtitle="Создайте аккаунт за минуту — бесплатно. Мастера, продавцы и клиенты в одной экосистеме." />

      <div className="flex-1 px-4 -mt-6 relative z-10 pb-10">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#1c1c1e] mb-3 text-center">Регистрация</h2>

          {role && (() => {
            const { label, icon: RoleIcon } = ROLE_META[role]
            return (
              <div className="flex items-center gap-3 rounded-xl bg-[#fdf2f1] border border-[#f5c6cb] px-3 py-2.5 mb-5">
                <span className="w-9 h-9 rounded-lg bg-brand-accent text-white flex items-center justify-center shrink-0">
                  <RoleIcon size={17} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-text-secondary leading-tight">Вы регистрируетесь как</span>
                  <span className="block text-[14px] font-bold text-[#1c1c1e] leading-tight">{label}</span>
                </span>
                <Link href="/auth/start" className="text-[13px] font-semibold text-brand-accent shrink-0">
                  Изменить
                </Link>
              </div>
            )
          })()}

          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-text-secondary mb-1.5">
                ФИО *
              </label>
              <input
                id="reg-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input w-full"
                placeholder="Иван Иванов"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-text-secondary mb-1.5">
                Email *
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="block text-xs font-semibold text-text-secondary mb-1.5">
                Пароль *
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input w-full"
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-text-secondary mb-1.5">
                Телефон
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full"
                placeholder="+7 999 123-45-67"
                autoComplete="tel"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3.5 font-bold text-[15px]"
            >
              {loading ? 'Регистрация…' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#8e8e93]">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="text-brand-accent font-semibold hover:underline">
              Войти
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-[#8e8e93] hover:text-[#1c1c1e] transition-colors">
            ← На главную
          </Link>
        </p>
      </div>
    </div>
  )
}

function RegisterPageFallback() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full">
      <div className="h-72 bg-gradient-to-br from-[#1c1c1e] to-[#8b2e28] animate-pulse" />
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 h-[520px] animate-pulse" />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterForm />
    </Suspense>
  )
}
