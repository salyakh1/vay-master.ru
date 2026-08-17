'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '@/app/providers'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { getMasterAccess } from '@/lib/masterAccess'
import {
  getNotificationPrefs,
  setNotificationPref,
  type NotificationPrefKey,
  type NotificationPrefs,
} from '@/lib/notification-prefs'
import { enableWebPush, disableWebPush } from '@/lib/webPushClient'
import {
  SettingsAccordionItem,
  SettingsBadge,
  SettingsHeader,
  SettingsProfilePreview,
  SettingsProBanner,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
  SettingsArrow,
} from './SettingsUI'
import {
  useSettingsForms,
  ProfileEditPanel,
  SpecializationsPanel,
  LocationPanel,
  StoreAddressPanel,
  PasswordPanel,
  EmailPanel,
  type SettingsPanelId,
} from './SettingsFormPanels'

const ROLE_LABELS: Record<string, string> = {
  master: 'Мастер',
  seller: 'Продавец',
  client: 'Клиент',
}

const AVATAR_BG: Record<string, string> = {
  master: '#c0392b',
  seller: '#1d3557',
  client: '#22a85e',
}

function getInitials(name: string) {
  return (
    name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

function specCountLabel(n: number) {
  if (n === 0) return 'Специализации не выбраны'
  const mod10 = n % 10
  const mod100 = n % 100
  let word = 'специализаций'
  if (mod10 === 1 && mod100 !== 11) word = 'специализация'
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'специализации'
  return `Выбрано ${n} ${word}`
}

function portfolioLabel(n: number) {
  if (n === 0) return 'Нет работ'
  const mod10 = n % 10
  const mod100 = n % 100
  let word = 'работ'
  if (mod10 === 1 && mod100 !== 11) word = 'работа'
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'работы'
  return `${n} ${word} опубликовано`
}

function DeleteAccountModal({
  email,
  onClose,
  onDeleted,
}: {
  email: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [confirmEmail, setConfirmEmail] = useState(email)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setError('')
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Не авторизован')

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: confirmEmail, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка удаления')

      await supabase.auth.signOut()
      onDeleted()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления аккаунта')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#1c1c1e] mb-2">Удалить аккаунт</h2>
        <p className="text-sm text-[#8e8e93] mb-4">Действие необратимо. Введите email и пароль.</p>
        <input type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="input w-full mb-3 text-sm" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full mb-3 text-sm" />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Отмена</button>
          <button type="button" onClick={handleDelete} disabled={loading || !confirmEmail || !password} className="btn bg-red-600 hover:bg-red-700 text-white border-red-600 flex-1">
            {loading ? 'Удаление…' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, signOut, refreshUser } = useAuth()
  const [specCount, setSpecCount] = useState(0)
  const [portfolioCount, setPortfolioCount] = useState(0)
  const [productsCount, setProductsCount] = useState(0)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({})
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [openPanel, setOpenPanel] = useState<SettingsPanelId | null>(null)

  const loadStats = useCallback(async (userId: string, role: string) => {
    if (role === 'master') {
      const [specRes, portRes] = await Promise.all([
        supabase.from('profile_subcategories').select('id', { count: 'exact', head: true }).eq('profile_id', userId),
        supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('master_id', userId),
      ])
      setSpecCount(specRes.count ?? 0)
      setPortfolioCount(portRes.count ?? 0)
    }
    if (role === 'seller') {
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', userId)
      setProductsCount(count ?? 0)
    }
  }, [])

  const onSaved = useCallback(() => {
    // Не блокируем UI: обновление в фоне
    void refreshUser()
    if (user) void loadStats(user.id, user.role)
  }, [refreshUser, loadStats, user])

  const forms = useSettingsForms(onSaved)

  const access = useMemo(() => (user ? getMasterAccess(user) : null), [user])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    setNotifPrefs(getNotificationPrefs(user.id, user.role))
    loadStats(user.id, user.role)
    setPushEnabled(typeof window !== 'undefined' && localStorage.getItem('vay_push_enabled') === '1')
  }, [user, loadStats])

  useEffect(() => {
    const open = searchParams.get('open') as SettingsPanelId | null
    if (open && ['profile', 'specializations', 'location', 'store', 'password', 'email'].includes(open)) {
      setOpenPanel(open)
    }
  }, [searchParams])

  const togglePanel = (id: SettingsPanelId) => {
    setOpenPanel((prev) => (prev === id ? null : id))
  }

  const toggleNotif = (key: NotificationPrefKey) => {
    if (!user) return
    setNotifPrefs(setNotificationPref(user.id, user.role, key, !notifPrefs[key]))
  }

  const togglePush = async () => {
    if (pushBusy) return
    setPushBusy(true)
    try {
      if (pushEnabled) {
        await disableWebPush()
        setPushEnabled(false)
      } else {
        const res = await enableWebPush()
        if (res.ok) setPushEnabled(true)
        else alert(res.error || 'Не удалось включить push')
      }
    } finally {
      setPushBusy(false)
    }
  }

  const pushToggleRow = (
    <SettingsRow
      icon="📱"
      title="Push на телефоне"
      subtitle={pushEnabled ? 'Включены' : 'Уведомления о заказах и сообщениях'}
      right={<SettingsToggle checked={pushEnabled} onChange={() => void togglePush()} />}
    />
  )

  const handleLogout = async () => {
    if (!confirm('Выйти из аккаунта?')) return
    await signOut()
    router.push('/')
  }

  const switchRole = async (newRole: 'master' | 'seller') => {
    if (!user) return
    const label = newRole === 'master' ? 'Мастер' : 'Продавец'
    const ok = confirm(
      newRole === 'master'
        ? 'Сменить роль на «Мастер»? После подтверждения откроется настройка специализаций.'
        : 'Открыть магазин? Роль сменится на «Продавец», затем можно выбрать категории товаров.'
    )
    if (!ok) return
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
      if (error) throw error
      await refreshUser()
      router.push(newRole === 'master' ? '/onboarding/specializations' : '/onboarding/seller')
    } catch (e) {
      console.error('switchRole', e)
      alert(`Не удалось сменить роль на «${label}». Попробуйте ещё раз.`)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-[#8e8e93]">Загрузка…</p>
      </div>
    )
  }

  const role = user.role
  const radius = user.service_radius_km ?? 50
  const locationSub =
    user.city && user.master_lat != null ? `${user.city} · радиус ${radius} км` : user.city || 'Не указано'

  const proTitle = access?.isPro ? 'PRO активен' : access?.isTrial ? 'Пробный PRO' : 'Подключите PRO'
  const proSubtitle =
    access?.isPro && user.pro_until
      ? `Действует до ${format(new Date(user.pro_until), 'd MMMM yyyy', { locale: ru })}`
      : access?.isTrial
        ? 'Бесплатный период'
        : role === 'seller'
          ? 'Приоритет в каталоге'
          : 'Больше заказов в поиске'
  const proBtn = access?.isPro ? 'Продлить' : role === 'seller' ? 'Управление' : 'Подключить'

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-20">
      <Navbar />
      <div className="max-w-lg mx-auto flex flex-col min-h-[calc(100vh-4rem)]">
        <SettingsHeader onBack={() => router.push(`/profile/${user.id}`)} />

        <div className="px-3 pb-1">
          <SettingsProfilePreview
            name={user.full_name}
            roleLabel={ROLE_LABELS[role] || 'Клиент'}
            city={user.city}
            avatarUrl={user.avatar_url}
            initials={getInitials(user.full_name)}
            avatarBg={AVATAR_BG[role] || AVATAR_BG.client}
            isPro={access?.isPro}
            profileHref={`/profile/${user.id}`}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {(role === 'master' || role === 'seller') && (
            <SettingsProBanner tag="Текущий план" title={proTitle} subtitle={proSubtitle} buttonLabel={proBtn} href="/pro" />
          )}

          {role === 'master' && (
            <>
              <SettingsSection title="Профиль мастера">
                <SettingsAccordionItem
                  icon="✏️"
                  iconBg="#fff1f2"
                  title="Редактировать профиль"
                  subtitle="Имя, фото, описание, контакты"
                  expanded={openPanel === 'profile'}
                  onToggle={() => togglePanel('profile')}
                >
                  <ProfileEditPanel forms={forms} />
                </SettingsAccordionItem>
                <SettingsAccordionItem
                  icon="🔧"
                  iconBg="#fff1f2"
                  title="Специализации и услуги"
                  subtitle={specCountLabel(
                    forms.selectedSubcategoryIds.length > 0
                      ? forms.selectedSubcategoryIds.length
                      : specCount
                  )}
                  expanded={openPanel === 'specializations'}
                  onToggle={() => togglePanel('specializations')}
                >
                  <SpecializationsPanel forms={forms} />
                </SettingsAccordionItem>
                <SettingsAccordionItem
                  icon="📍"
                  iconBg="#fff1f2"
                  title="Геолокация и радиус"
                  subtitle={locationSub}
                  expanded={openPanel === 'location'}
                  onToggle={() => togglePanel('location')}
                >
                  <LocationPanel />
                </SettingsAccordionItem>
                <SettingsRow icon="🖼️" iconBg="#fff1f2" title="Портфолио" subtitle={portfolioLabel(portfolioCount)} href={`/profile/${user.id}`} right={<SettingsArrow />} />
              </SettingsSection>

              <SettingsSection title="Уведомления">
                {pushToggleRow}
                <SettingsRow icon="🔔" title="Новые заказы" subtitle="В чате и push" right={<SettingsToggle checked={!!notifPrefs.new_orders} onChange={() => toggleNotif('new_orders')} />} />
                <SettingsRow icon="💬" title="Сообщения в чатах" right={<SettingsToggle checked={!!notifPrefs.chat_messages} onChange={() => toggleNotif('chat_messages')} />} />
                <SettingsRow icon="⭐" title="Новые отзывы" right={<SettingsToggle checked={!!notifPrefs.new_reviews} onChange={() => toggleNotif('new_reviews')} />} />
                <SettingsRow icon="📢" title="Акции и новости" right={<SettingsToggle checked={!!notifPrefs.promotions} onChange={() => toggleNotif('promotions')} />} />
              </SettingsSection>
            </>
          )}

          {role === 'seller' && (
            <>
              <SettingsSection title="Мой магазин">
                <SettingsRow
                  icon="📦"
                  iconBg="#fff1f2"
                  title="Управление товарами"
                  subtitle={productsCount > 0 ? `${productsCount} в каталоге` : 'Добавьте первый товар'}
                  href="/products"
                  right={<SettingsArrow />}
                />
                <SettingsRow
                  icon="📊"
                  iconBg="#fff1f2"
                  title="Аналитика продаж"
                  subtitle="Просмотры и конверсия"
                  href="/activity"
                  right={
                    <>
                      <SettingsBadge variant="green">Новое</SettingsBadge>
                      <SettingsArrow />
                    </>
                  }
                />
                <SettingsAccordionItem
                  icon="📍"
                  iconBg="#fff1f2"
                  title="Адрес и зона доставки"
                  subtitle={user.delivery_zones || user.store_address || user.city || 'Не указано'}
                  expanded={openPanel === 'store'}
                  onToggle={() => togglePanel('store')}
                >
                  <StoreAddressPanel onSaved={onSaved} />
                </SettingsAccordionItem>
                <SettingsAccordionItem
                  icon="🏪"
                  iconBg="#fff1f2"
                  title="Настройки магазина"
                  subtitle="Описание, режим работы"
                  expanded={openPanel === 'profile'}
                  onToggle={() => togglePanel('profile')}
                >
                  <ProfileEditPanel forms={forms} />
                </SettingsAccordionItem>
              </SettingsSection>

              <SettingsSection title="Уведомления">
                {pushToggleRow}
                <SettingsRow icon="💬" title="Сообщения покупателей" right={<SettingsToggle checked={!!notifPrefs.buyer_messages} onChange={() => toggleNotif('buyer_messages')} />} />
                <SettingsRow icon="⭐" title="Новые отзывы на товары" right={<SettingsToggle checked={!!notifPrefs.product_reviews} onChange={() => toggleNotif('product_reviews')} />} />
                <SettingsRow icon="📢" title="Акции и маркетинг" right={<SettingsToggle checked={!!notifPrefs.promotions} onChange={() => toggleNotif('promotions')} />} />
              </SettingsSection>
            </>
          )}

          {role === 'client' && (
            <>
              <SettingsSection title="Личные данные">
                <SettingsAccordionItem
                  icon="👤"
                  iconBg="#fff1f2"
                  title="Имя и фото профиля"
                  expanded={openPanel === 'profile'}
                  onToggle={() => togglePanel('profile')}
                >
                  <ProfileEditPanel forms={forms} />
                </SettingsAccordionItem>
                <SettingsAccordionItem icon="📧" iconBg="#fff1f2" title="Email" subtitle={user.email} expanded={openPanel === 'email'} onToggle={() => togglePanel('email')}>
                  <EmailPanel email={user.email} />
                </SettingsAccordionItem>
              </SettingsSection>

              <SettingsSection title="Уведомления">
                {pushToggleRow}
                <SettingsRow icon="📋" title="Отклики на мои заказы" right={<SettingsToggle checked={!!notifPrefs.order_responses} onChange={() => toggleNotif('order_responses')} />} />
                <SettingsRow icon="💬" title="Новые сообщения" right={<SettingsToggle checked={!!notifPrefs.chat_messages} onChange={() => toggleNotif('chat_messages')} />} />
                <SettingsRow icon="📢" title="Акции и предложения" right={<SettingsToggle checked={!!notifPrefs.promotions} onChange={() => toggleNotif('promotions')} />} />
              </SettingsSection>

              <SettingsSection title="Возможности">
                <SettingsRow
                  icon="🔨"
                  iconBg="#fff1f2"
                  title="Стать мастером"
                  subtitle="Начните получать заказы"
                  onClick={() => void switchRole('master')}
                  right={
                    <>
                      <SettingsBadge>Новое</SettingsBadge>
                      <SettingsArrow />
                    </>
                  }
                />
                <SettingsRow
                  icon="🛒"
                  iconBg="#fff1f2"
                  title="Открыть магазин"
                  subtitle="Продавайте на платформе"
                  onClick={() => void switchRole('seller')}
                  right={<SettingsArrow />}
                />
              </SettingsSection>
            </>
          )}

          <SettingsSection title="Аккаунт и безопасность">
            {(role === 'master' || role === 'seller' || role === 'client') && (
              <SettingsAccordionItem icon="📧" title="Email" subtitle={user.email} expanded={openPanel === 'email'} onToggle={() => togglePanel('email')}>
                <EmailPanel email={user.email} />
              </SettingsAccordionItem>
            )}
            <SettingsAccordionItem icon="🔒" title="Сменить пароль" subtitle="Обновить пароль входа" expanded={openPanel === 'password'} onToggle={() => togglePanel('password')}>
              <PasswordPanel forms={forms} />
            </SettingsAccordionItem>
            <SettingsRow icon="🛡" title="Двухфакторная аутентификация" right={<SettingsBadge variant="gray">Скоро</SettingsBadge>} />
          </SettingsSection>

          <SettingsSection title={role === 'seller' ? undefined : 'Прочее'}>
            {role === 'master' && (
              <>
                <SettingsRow icon="🌐" title="Язык" right={<span className="text-xs text-[#8e8e93]">Русский</span>} />
                <SettingsRow icon="❓" title="Поддержка" href="mailto:support@vay-master.ru" right={<SettingsArrow />} />
                <SettingsRow icon="📄" title="Пользовательское соглашение" href="/rules" right={<SettingsArrow />} />
              </>
            )}
            {role === 'client' && <SettingsRow icon="❓" title="Поддержка" href="mailto:support@vay-master.ru" right={<SettingsArrow />} />}
            <SettingsRow icon="🚪" iconBg="#fff0f0" title="Выйти из аккаунта" onClick={handleLogout} danger />
            {(role === 'master' || role === 'client') && (
              <SettingsRow icon="🗑" iconBg="#fff0f0" title="Удалить аккаунт" subtitle="Необратимо" onClick={() => setShowDeleteModal(true)} danger />
            )}
          </SettingsSection>

          <div className="h-24" />
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal email={user.email} onClose={() => setShowDeleteModal(false)} onDeleted={() => router.push('/')} />
      )}
    </div>
  )
}
