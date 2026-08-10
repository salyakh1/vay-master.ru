'use client'

import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import {
  SERVICE_PRICE_UNITS,
  formatServicePrice,
  isServicePriceUnit,
  parsePriceInput,
  type ServicePriceUnit,
} from '@/lib/service-price'

export type PricedServiceItem = {
  id: string
  name: string
  price?: number | null
  price_unit?: ServicePriceUnit | null
  /** id строки profile_services — нужен для update; без него только просмотр */
  profileServiceId?: string
}

type ProfileServicesSheetProps = {
  open: boolean
  services: PricedServiceItem[]
  onClose: () => void
  isOwnProfile?: boolean
  onPricesChange?: (next: PricedServiceItem[]) => void
}

type DraftRow = {
  priceText: string
  unit: ServicePriceUnit
  saving: boolean
  error: string | null
}

export default function ProfileServicesSheet({
  open,
  services,
  onClose,
  isOwnProfile = false,
  onPricesChange,
}: ProfileServicesSheetProps) {
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!open) return
    const next: Record<string, DraftRow> = {}
    for (const svc of services) {
      next[svc.id] = {
        priceText: svc.price != null && Number.isFinite(Number(svc.price)) ? String(svc.price) : '',
        unit: isServicePriceUnit(svc.price_unit) ? svc.price_unit : 'm2',
        saving: false,
        error: null,
      }
    }
    setDrafts(next)
  }, [open, services])

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout)
    }
  }, [])

  if (!open) return null

  const persist = async (svc: PricedServiceItem, priceText: string, unit: ServicePriceUnit) => {
    if (!isOwnProfile || !svc.profileServiceId) return

    const price = parsePriceInput(priceText)
    setDrafts((prev) => ({
      ...prev,
      [svc.id]: { ...(prev[svc.id] || { priceText, unit, saving: false, error: null }), saving: true, error: null },
    }))

    const { error } = await supabase
      .from('profile_services')
      .update({
        price,
        price_unit: price == null ? null : unit,
      })
      .eq('id', svc.profileServiceId)

    if (error) {
      setDrafts((prev) => ({
        ...prev,
        [svc.id]: {
          ...(prev[svc.id] || { priceText, unit, saving: false, error: null }),
          saving: false,
          error: 'Не удалось сохранить',
        },
      }))
      return
    }

    setDrafts((prev) => ({
      ...prev,
      [svc.id]: {
        ...(prev[svc.id] || { priceText, unit, saving: false, error: null }),
        saving: false,
        error: null,
      },
    }))

    onPricesChange?.(
      services.map((s) =>
        s.id === svc.id
          ? { ...s, price, price_unit: price == null ? null : unit }
          : s
      )
    )
  }

  const scheduleSave = (svc: PricedServiceItem, priceText: string, unit: ServicePriceUnit) => {
    if (saveTimers.current[svc.id]) clearTimeout(saveTimers.current[svc.id])
    saveTimers.current[svc.id] = setTimeout(() => {
      void persist(svc, priceText, unit)
    }, 450)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl px-3.5 pt-3 pb-6 safe-area-pb"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 bg-[#e5e7eb] rounded-full mx-auto mb-3" aria-hidden />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[14px] font-medium text-[#111111]">Все услуги</p>
            {isOwnProfile && (
              <p className="text-[11px] text-[#9ca3af] mt-0.5">Укажите цену справа — её увидят клиенты в поиске</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9ca3af] hover:text-[#111] rounded-lg"
            aria-label="Закрыть"
          >
            <FiX size={18} />
          </button>
        </div>
        {services.length === 0 ? (
          <p className="text-[12px] text-[#9ca3af] py-4 text-center">Услуги не указаны</p>
        ) : (
          <ul className="flex flex-col max-h-[60vh] overflow-y-auto">
            {services.map((svc, i) => {
              const draft = drafts[svc.id]
              const canEdit = isOwnProfile && !!svc.profileServiceId
              const viewLabel = formatServicePrice(svc.price, svc.price_unit)

              return (
                <li
                  key={svc.id}
                  className={`flex items-center gap-2 py-2.5 ${
                    i < services.length - 1 ? 'border-b border-[#e5e7eb]' : ''
                  }`}
                >
                  <span className="text-[12px] text-[#111111] flex-1 min-w-0 leading-snug pr-1">
                    {svc.name}
                  </span>

                  {canEdit && draft ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="цена"
                        value={draft.priceText}
                        onChange={(e) => {
                          const priceText = e.target.value.replace(/[^\d.,\s]/g, '')
                          setDrafts((prev) => ({
                            ...prev,
                            [svc.id]: { ...draft, priceText, error: null },
                          }))
                          scheduleSave(svc, priceText, draft.unit)
                        }}
                        onBlur={() => {
                          if (saveTimers.current[svc.id]) clearTimeout(saveTimers.current[svc.id])
                          void persist(svc, draft.priceText, draft.unit)
                        }}
                        className="w-[72px] text-right text-[12px] text-[#111] bg-[#f4f4f4] border border-[#e5e7eb] rounded-lg px-2 py-1.5 outline-none focus:border-[#c0392b]"
                        aria-label={`Цена: ${svc.name}`}
                      />
                      <select
                        value={draft.unit}
                        onChange={(e) => {
                          const unit = e.target.value as ServicePriceUnit
                          setDrafts((prev) => ({
                            ...prev,
                            [svc.id]: { ...draft, unit, error: null },
                          }))
                          scheduleSave(svc, draft.priceText, unit)
                        }}
                        className="text-[11px] text-[#374151] bg-[#f4f4f4] border border-[#e5e7eb] rounded-lg px-1.5 py-1.5 outline-none focus:border-[#c0392b]"
                        aria-label={`Единица: ${svc.name}`}
                      >
                        {SERVICE_PRICE_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                      {draft.saving && <span className="text-[9px] text-[#9ca3af] w-3">…</span>}
                    </div>
                  ) : (
                    <span
                      className={`text-[12px] flex-shrink-0 tabular-nums ${
                        viewLabel ? 'font-medium text-[#111111]' : 'text-[#d1d5db]'
                      }`}
                    >
                      {viewLabel || '—'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export function buildServicesSummary(names: string[]): string {
  const clean = names.filter(Boolean)
  if (clean.length === 0) return 'Услуги не указаны'
  if (clean.length <= 2) return clean.join(', ')
  return `${clean.slice(0, 2).join(', ')} и ещё ${clean.length - 2}`
}
