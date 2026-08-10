'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, UserRole } from '@/lib/supabase'
import Link from 'next/link'
import AuthBrandHero from '@/components/auth/AuthBrandHero'
import { localizeAuthError } from '@/components/auth/localizeAuthError'

const VALID_ROLES: UserRole[] = ['master', 'seller', 'client']

function isUserRole(v: string | null): v is UserRole {
  return v != null && VALID_ROLES.includes(v as UserRole)
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [roleTouched, setRoleTouched] = useState(false)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const r = searchParams.get('role')
    if (isUserRole(r)) {
      setRole(r)
      setRoleTouched(true)
    }
  }, [searchParams])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!role) {
      setRoleTouched(true)
      setError('Пожалуйста, выберите роль')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            phone: phone || null,
            city: city || null,
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
              city: city || null,
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
          const welcomeResponse = await fetch('/api/welcome-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authData.user.id, role: role }),
          })
          const welcomeData = await welcomeResponse.json()
          if (!welcomeResponse.ok) {
            console.error('[register] Failed to send welcome message:', welcomeData)
          }
        } catch (welcomeError: unknown) {
          console.error('[register] Error sending welcome message:', welcomeError)
        }

        if (role === 'master') {
          router.push('/onboarding/specializations')
        } else if (role === 'seller') {
          router.push('/onboarding/seller')
        } else {
          router.push('/onboarding')
        }
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
          <h2 className="text-lg font-bold text-[#1c1c1e] mb-1 text-center">Регистрация</h2>
          <p className="text-center text-xs text-text-secondary mb-5">Выберите роль и заполните данные</p>

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

            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label htmlFor="reg-city" className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Город
                </label>
                <input
                  id="reg-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input w-full"
                  placeholder="Москва"
                  autoComplete="address-level2"
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-xs font-semibold text-text-secondary">Выберите роль *</label>
                {roleTouched && !role && (
                  <span className="text-[11px] font-semibold text-brand-accent">Роль не выбрана</span>
                )}
              </div>
              <div
                role="radiogroup"
                aria-label="Роль пользователя"
                aria-invalid={roleTouched && !role ? 'true' : 'false'}
                className={[
                  'grid grid-cols-3 gap-2',
                  roleTouched && !role ? 'rounded-xl p-1 bg-[#fdf0f0] border border-[#f5c6cb]' : '',
                ].join(' ')}
              >
                {(
                  [
                    { id: 'role-master', value: 'master' as const, label: 'Мастер', icon: '🔨' },
                    { id: 'role-seller', value: 'seller' as const, label: 'Продавец', icon: '🛒' },
                    { id: 'role-client', value: 'client' as const, label: 'Клиент', icon: '👤' },
                  ] as const
                ).map((item) => {
                  const selected = role === item.value
                  return (
                    <label
                      key={item.id}
                      htmlFor={item.id}
                      className={[
                        'cursor-pointer select-none rounded-xl border px-2 py-2.5',
                        'flex flex-col items-center justify-center gap-1',
                        'transition-all duration-150 active:scale-[0.98]',
                        selected
                          ? 'bg-brand-accent border-brand-accent text-white shadow-sm'
                          : 'bg-[#f5f5f7] border-[#e5e5ea] text-[#1c1c1e] hover:border-brand-accent/40',
                      ].join(' ')}
                    >
                      <input
                        id={item.id}
                        type="radio"
                        name="role"
                        value={item.value}
                        checked={selected}
                        onChange={() => {
                          setRoleTouched(true)
                          setRole(item.value)
                        }}
                        className="sr-only"
                      />
                      <span className="text-xl leading-none" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </label>
                  )
                })}
              </div>
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
