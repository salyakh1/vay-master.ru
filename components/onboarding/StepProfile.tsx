'use client'

import { useEffect, useRef, useState } from 'react'
import { FiCamera, FiImage, FiUser, FiShoppingBag, FiMapPin } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { hapticTap } from '@/lib/nativeApp'
import OnboardingShell, { OnbError, OnbPrimaryButton, OnbSkipButton } from './OnboardingShell'
import type { OnboardingStepProps } from './types'

const MAX_AVATAR_BYTES = 8 * 1024 * 1024

export default function StepProfile({ user, index, total, onBack, onNext }: OnboardingStepProps) {
  const { refreshUser } = useAuth()
  const isSeller = user.role === 'seller'
  const [name, setName] = useState(user.full_name === 'Пользователь' ? '' : user.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')
  const [specNames, setSpecNames] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSeller) return
    supabase
      .from('profile_subcategories')
      .select('subcategories(name)')
      .eq('profile_id', user.id)
      .limit(3)
      .then(({ data }) => {
        const names = (data || [])
          .map((r) => {
            const sub = (r as { subcategories?: { name?: string } | { name?: string }[] | null }).subcategories
            return Array.isArray(sub) ? sub[0]?.name : sub?.name
          })
          .filter((n): n is string => Boolean(n))
        setSpecNames(names)
      })
  }, [isSeller, user.id])

  const upload = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Нужна фотография')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Фото больше 8 МБ — выберите другое')
      return
    }
    setUploading(true)
    setError('')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      const { error: e } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      if (e) throw e
      setAvatarUrl(data.publicUrl)
      hapticTap()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError(isSeller ? 'Введите название магазина' : 'Введите имя')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (trimmed !== user.full_name) {
        const { error: e } = await supabase.from('profiles').update({ full_name: trimmed }).eq('id', user.id)
        if (e) throw e
      }
      await refreshUser()
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const PlaceholderIcon = isSeller ? FiShoppingBag : FiUser
  const previewSubtitle = isSeller
    ? [user.city, 'Магазин'].filter(Boolean).join(' · ')
    : [specNames.slice(0, 2).join(', '), user.service_radius_km ? `до ${user.service_radius_km} км` : '']
        .filter(Boolean)
        .join(' · ') || 'Мастер'

  return (
    <OnboardingShell
      total={total}
      current={index}
      stepKey="profile"
      onBack={onBack}
      title={isSeller ? 'Ваш магазин' : 'Как вас увидят клиенты'}
      subtitle={
        isSeller
          ? 'Логотип и понятное название повышают доверие покупателей.'
          : 'Профили с живым фото выбирают заметно чаще, чем без него.'
      }
      footer={
        <>
          <OnbError message={error} />
          <OnbPrimaryButton onClick={handleSave} loading={saving} disabled={uploading || name.trim().length < 2}>
            Продолжить
          </OnbPrimaryButton>
          {!avatarUrl && <OnbSkipButton onClick={handleSave}>Добавлю фото позже</OnbSkipButton>}
        </>
      }
    >
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          aria-label="Выбрать фото"
          className="relative w-32 h-32 rounded-full bg-white shadow-sm border-2 border-dashed border-[#d1d1d6] overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <PlaceholderIcon size={40} className="text-[#c7c7cc]" />
          )}
          {uploading && (
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="w-7 h-7 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            </span>
          )}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2 w-full">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="h-11 rounded-xl bg-white shadow-sm text-[14px] font-semibold text-[#1c1c1e] flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <FiCamera size={17} /> Камера
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="h-11 rounded-xl bg-white shadow-sm text-[14px] font-semibold text-[#1c1c1e] flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <FiImage size={17} /> Галерея
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture={isSeller ? 'environment' : 'user'}
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <label className="block mt-6">
        <span className="block text-[13px] font-semibold text-[#6e6e73] mb-1.5">
          {isSeller ? 'Название магазина' : 'Имя и фамилия'}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder={isSeller ? 'Например: Стройдвор на Ленина' : 'Например: Ислам Ахмадов'}
          autoComplete={isSeller ? 'organization' : 'name'}
          className="w-full h-12 rounded-2xl bg-white border border-[#e5e5ea] px-4 text-[15px] outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10"
        />
      </label>

      <p className="mt-6 mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8e8e93]">Так вас увидят в поиске</p>
      <div className="rounded-2xl bg-white p-3.5 shadow-sm flex items-center gap-3">
        <span className="w-14 h-14 rounded-full bg-[#f4f4f4] overflow-hidden flex items-center justify-center shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <PlaceholderIcon size={22} className="text-[#c7c7cc]" />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-[#1c1c1e] truncate">
            {name.trim() || (isSeller ? 'Название магазина' : 'Ваше имя')}
          </span>
          <span className="flex items-center gap-1 text-[13px] text-[#6e6e73] truncate">
            {!isSeller && user.city && <FiMapPin size={12} className="shrink-0" />}
            <span className="truncate">{isSeller ? previewSubtitle : [user.city, previewSubtitle].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
      </div>
    </OnboardingShell>
  )
}
