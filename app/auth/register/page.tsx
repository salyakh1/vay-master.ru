'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, UserRole } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [roleTouched, setRoleTouched] = useState(false)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      // Sign up with Supabase Auth and pass metadata
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
        // Если сессия не создана автоматически, ждем немного и проверяем
        if (!authData.session) {
          // Ждем, пока сессия установится (может потребоваться время для подтверждения email)
          await new Promise(resolve => setTimeout(resolve, 1000))
          // Проверяем сессию еще раз
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            console.warn('Session not created after registration, user may need to login')
          }
        }
        
        // Profile will be created automatically by trigger
        // Wait a bit for trigger to execute, then verify profile exists
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verify profile was created (optional check)
        const { data: profileData, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        // If profile doesn't exist, try to create it manually as fallback
        if (!profileData && !profileCheckError) {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role,
                phone: phone || null,
                city: city || null,
              })

            if (profileError) {
              console.error('Profile creation error:', profileError)
              // Don't throw - user is registered, profile can be created later
            }
          } catch (err: any) {
            console.error('Profile creation exception:', err)
            // Don't throw - user is registered, profile can be created later
          }
        }

        // Email confirmation is handled by SQL trigger (auto_confirm_on_user_created)
        // If user is not confirmed yet, wait a bit more for trigger
        if (!authData.user.email_confirmed_at) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Отправляем приветственное сообщение от администрации
        // Добавляем небольшую задержку, чтобы профиль точно был создан
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          console.log('[register] Sending welcome message for user:', authData.user.id, 'role:', role)
          const welcomeResponse = await fetch('/api/welcome-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: authData.user.id,
              role: role,
            }),
          })

          const welcomeData = await welcomeResponse.json()
          
          if (!welcomeResponse.ok) {
            console.error('[register] Failed to send welcome message:', {
              status: welcomeResponse.status,
              statusText: welcomeResponse.statusText,
              data: welcomeData
            })
            // Не прерываем регистрацию, если не удалось отправить приветственное сообщение
          } else {
            console.log('[register] Welcome message sent successfully:', welcomeData)
          }
        } catch (welcomeError: any) {
          console.error('[register] Error sending welcome message:', {
            error: welcomeError.message,
            stack: welcomeError.stack
          })
          // Не прерываем регистрацию, если не удалось отправить приветственное сообщение
        }

        // После регистрации перенаправляем в зависимости от роли
        if (role === 'master') {
          router.push('/onboarding/specializations')
        } else if (role === 'seller') {
          router.push('/onboarding/seller')
        } else {
          router.push('/')
        }
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4">
      <div className="max-w-md w-full card">
        <h2 className="text-xl font-bold text-center mb-8 text-black">Регистрация</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              ФИО *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="input"
              placeholder="Иван Иванов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email *
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
              Пароль *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input"
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Телефон
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Город
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input"
              placeholder="Москва"
            />
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-medium">
                Выберите роль *
              </label>
              {!role && (
                <span className="text-xs font-semibold text-red-600">
                  Роль не выбрана
                </span>
              )}
            </div>
            <div
              role="radiogroup"
              aria-label="Роль пользователя"
              aria-invalid={roleTouched && !role ? 'true' : 'false'}
              className={[
                'grid grid-cols-3 gap-2',
                roleTouched && !role ? 'rounded-2xl p-1 bg-red-50 border border-red-200' : '',
              ].join(' ')}
            >
              {(
                [
                  { id: 'role-master', value: 'master', label: 'Мастер', icon: '🔨' },
                  { id: 'role-seller', value: 'seller', label: 'Продавец', icon: '🛒' },
                  { id: 'role-client', value: 'client', label: 'Клиент', icon: '👤' },
                ] as const
              ).map((item) => {
                const selected = role === item.value
                return (
                  <label
                    key={item.id}
                    htmlFor={item.id}
                    className={[
                      'cursor-pointer select-none rounded-2xl border px-3 py-3',
                      'flex flex-col items-center justify-center gap-1',
                      'transition-colors duration-150',
                      selected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300',
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
                    <div className="relative">
                      <span className="text-2xl leading-none" aria-hidden="true">
                        {item.icon}
                      </span>
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center"
                        >
                          <span className="text-[12px] leading-none">✓</span>
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </label>
                )
              })}
            </div>
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
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}

