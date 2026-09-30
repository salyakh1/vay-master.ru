'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { FiNavigation, FiSearch, FiMapPin, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { hapticTap } from '@/lib/nativeApp'
import OnboardingShell, { OnbError, OnbPrimaryButton, OnbSkipButton } from './OnboardingShell'
import type { OnboardingStepProps } from './types'

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e8e8ea] animate-pulse" />,
})

const DEFAULT_CENTER: [number, number] = [43.3179, 45.6981]
const RADIUS_OPTIONS = [5, 10, 25, 50, 100]

type Suggestion = { display_name: string; lat: number; lng: number }

function readSavedView(): [number, number] | null {
  try {
    const raw = localStorage.getItem('vay_nearby_view')
    if (!raw) return null
    const v = JSON.parse(raw) as { lat?: number; lng?: number }
    return typeof v.lat === 'number' && typeof v.lng === 'number' ? [v.lat, v.lng] : null
  } catch {
    return null
  }
}

export default function StepLocation({ user, index, total, onBack, onNext }: OnboardingStepProps) {
  const { refreshUser } = useAuth()
  const mode = user.role
  const withRadius = mode === 'master'

  const initialPos: [number, number] | null =
    mode === 'master' && user.master_lat != null && user.master_lng != null
      ? [user.master_lat, user.master_lng]
      : mode === 'seller' && user.seller_lat != null && user.seller_lng != null
        ? [user.seller_lat, user.seller_lng]
        : null

  const [center, setCenter] = useState<[number, number]>(initialPos ?? DEFAULT_CENTER)
  const [chosen, setChosen] = useState(Boolean(initialPos))
  const [radius, setRadius] = useState<number>(user.service_radius_km || 25)
  const [fitToken, setFitToken] = useState(0)
  const [city, setCity] = useState(user.city || '')
  const [label, setLabel] = useState(mode === 'seller' ? user.store_address || '' : '')
  const [locating, setLocating] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const reverseTimer = useRef<number | null>(null)

  useEffect(() => {
    if (initialPos) return
    const saved = readSavedView()
    if (saved) {
      setCenter(saved)
      setFitToken((n) => n + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (reverseTimer.current) window.clearTimeout(reverseTimer.current)
    reverseTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
        const data = (await res.json()) as { city?: string | null; label?: string | null }
        if (data.city) setCity(data.city)
        if (data.label) setLabel(data.label)
      } catch {
        /* ignore */
      }
    }, 500)
  }, [])

  const choosePoint = useCallback(
    (lat: number, lng: number, fit = false) => {
      setCenter([lat, lng])
      setChosen(true)
      setError('')
      if (fit) setFitToken((n) => n + 1)
      reverseGeocode(lat, lng)
    },
    [reverseGeocode]
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`)
        const data = (await res.json()) as { results?: Suggestion[] }
        setSuggestions(data.results || [])
      } catch {
        setSuggestions([])
      }
    }, 350)
    return () => window.clearTimeout(t)
  }, [query])

  const locate = () => {
    if (!navigator.geolocation) {
      setError('Геолокация недоступна. Найдите адрес через поиск.')
      return
    }
    hapticTap()
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        choosePoint(pos.coords.latitude, pos.coords.longitude, true)
      },
      () => {
        setLocating(false)
        setError('Не удалось определить место. Разрешите доступ к геолокации или найдите адрес.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }

  const handleSave = async () => {
    if (!chosen) {
      setError('Укажите точку: кнопкой «Определить» или через поиск')
      return
    }
    setSaving(true)
    setError('')
    const [lat, lng] = center
    const payload: Record<string, unknown> = {}
    if (city) payload.city = city
    if (mode === 'master') {
      payload.master_lat = lat
      payload.master_lng = lng
      payload.service_radius_km = radius
    } else if (mode === 'seller') {
      payload.seller_lat = lat
      payload.seller_lng = lng
      if (label) payload.store_address = label
    }
    try {
      if (Object.keys(payload).length) {
        const { error: e } = await supabase.from('profiles').update(payload).eq('id', user.id)
        if (e) throw e
      }
      try {
        localStorage.setItem('vay_nearby_view', JSON.stringify({ lat, lng }))
        if (withRadius) localStorage.setItem('vay_search_radius_km', String(radius))
      } catch {
        /* ignore */
      }
      await refreshUser()
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const copy =
    mode === 'master'
      ? { title: 'Где вы работаете?', subtitle: 'Заказы в этой зоне будут приходить вам первыми.' }
      : mode === 'seller'
        ? { title: 'Где находится магазин?', subtitle: 'Покупатели рядом увидят ваши товары выше в каталоге.' }
        : { title: 'Где вы находитесь?', subtitle: 'Покажем мастеров и товары рядом с вами.' }

  return (
    <OnboardingShell
      total={total}
      current={index}
      stepKey="location"
      onBack={onBack}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          <OnbError message={error} />
          <OnbPrimaryButton onClick={handleSave} loading={saving} disabled={!chosen}>
            Продолжить
          </OnbPrimaryButton>
          {mode === 'client' && <OnbSkipButton onClick={onNext}>Пропустить</OnbSkipButton>}
        </>
      }
    >
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="w-full h-12 mb-3 rounded-2xl bg-[#1c1c1e] text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
      >
        {locating ? (
          <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          <FiNavigation size={17} />
        )}
        {locating ? 'Определяем…' : 'Определить моё место'}
      </button>

      <div className="relative mb-3">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'seller' ? 'Адрес магазина' : 'Город или адрес'}
          className="w-full h-12 rounded-2xl bg-white border border-[#e5e5ea] pl-11 pr-10 text-[15px] outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSuggestions([])
            }}
            aria-label="Очистить"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[#8e8e93]"
          >
            <FiX size={16} />
          </button>
        )}
        {suggestions.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 top-[calc(100%+6px)] rounded-2xl bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)] overflow-hidden">
            {suggestions.map((s) => (
              <li key={`${s.lat},${s.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setSuggestions([])
                    choosePoint(s.lat, s.lng, true)
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-[#f4f4f4]"
                >
                  <FiMapPin className="mt-0.5 text-brand-accent shrink-0" size={16} />
                  <span className="text-[14px] text-[#1c1c1e] leading-snug line-clamp-2">{s.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative h-[300px] rounded-2xl overflow-hidden shadow-sm touch-none">
        <LocationMap
          center={center}
          radiusKm={withRadius ? radius : null}
          fitToken={fitToken}
          onCenterChange={(lat, lng) => choosePoint(lat, lng)}
          onRadiusChange={setRadius}
        />
        {(city || label) && chosen && (
          <div className="absolute left-3 right-3 top-3 z-[400] rounded-xl bg-white/95 backdrop-blur px-3 py-2 shadow-md flex items-center gap-2 pointer-events-none">
            <FiMapPin className="text-brand-accent shrink-0" size={15} />
            <span className="text-[13px] font-semibold text-[#1c1c1e] truncate">{label || city}</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-[12px] text-[#8e8e93]">
        {withRadius ? 'Двигайте метку пальцем, щипок по карте меняет радиус.' : 'Двигайте метку пальцем или нажмите на карту.'}
      </p>

      {withRadius && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[14px] font-semibold text-[#1c1c1e]">Выезжаю до</span>
            <span className="font-display text-[22px] font-extrabold text-brand-accent tabular-nums">{radius} км</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => {
                  hapticTap()
                  setRadius(km)
                  setFitToken((n) => n + 1)
                }}
                className={[
                  'h-10 rounded-xl text-[14px] font-bold transition-all active:scale-95',
                  radius === km ? 'bg-brand-accent text-white shadow-sm' : 'bg-[#f4f4f4] text-[#1c1c1e]',
                ].join(' ')}
              >
                {km}
              </button>
            ))}
          </div>
        </div>
      )}
    </OnboardingShell>
  )
}
