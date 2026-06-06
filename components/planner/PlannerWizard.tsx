'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  FLOOR_MATS,
  WALL_MATS,
  CEIL_MATS,
  PLANNER_CHECKLIST,
  findMatLabel,
} from './planner-ui-data'
import type { RecommendedMaster, RecommendedProduct } from './planner-types'

type PlannerWizardProps = {
  step: number
  onStepChange: (step: number) => void
  onBack: () => void
  onSave: () => void
  onCreateOrder: () => void
  floorArea: number
  wallArea: number
  ceilingArea: number
  wallHeight: number
  onWallHeightChange: (h: number) => void
  floorMat: string
  wallMat: string
  ceilMat: string
  onFloorMat: (id: string) => void
  onWallMat: (id: string) => void
  onCeilMat: (id: string) => void
  floorThick: number
  wallThick: number
  onFloorThick: (v: number) => void
  onWallThick: (v: number) => void
  checked: Record<string, boolean>
  onToggleCheck: (id: string) => void
  drawTool: 'draw' | 'door' | 'window'
  onDrawTool: (t: 'draw' | 'door' | 'window') => void
  onUndo: () => void
  showCanvasHint: boolean
  recommendedMasters: RecommendedMaster[]
  recommendedProducts: RecommendedProduct[]
  recommendationsLoading: boolean
  children: React.ReactNode
}

const STEP_NEXT = ['Материалы →', 'Расчёт →', 'Рекомендации →', 'Создать заказ']

export default function PlannerWizard({
  step,
  onStepChange,
  onBack,
  onSave,
  onCreateOrder,
  floorArea,
  wallArea,
  ceilingArea,
  wallHeight,
  onWallHeightChange,
  floorMat,
  wallMat,
  ceilMat,
  onFloorMat,
  onWallMat,
  onCeilMat,
  floorThick,
  wallThick,
  onFloorThick,
  onWallThick,
  checked,
  onToggleCheck,
  drawTool,
  onDrawTool,
  onUndo,
  showCanvasHint,
  recommendedMasters,
  recommendedProducts,
  recommendationsLoading,
  children,
}: PlannerWizardProps) {
  const floorLabel = findMatLabel(FLOOR_MATS, floorMat)
  const wallLabel = findMatLabel(WALL_MATS, wallMat)
  const ceilLabel = findMatLabel(CEIL_MATS, ceilMat)
  const plasterVol = +((wallArea || 0) * (wallThick / 100)).toFixed(3)

  const next = () => {
    if (step >= 4) {
      onCreateOrder()
      return
    }
    onStepChange(step + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prev = () => {
    if (step > 1) {
      onStepChange(step - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  let lastGroup = ''

  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-28">
      <div className="sticky top-0 z-50 bg-white border-b border-[#e5e5ea]/80 px-4 py-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-[#f2f2f7] border border-[#e5e5ea] flex items-center justify-center text-[#c0392b] text-base"
          aria-label="Назад"
        >
          ←
        </button>
        <h1 className="text-[15px] font-bold text-[#1c1c1e] flex-1">Планировщик комнаты</h1>
        <button
          type="button"
          onClick={onSave}
          className="bg-[#c0392b] text-white text-[11px] font-semibold px-3.5 py-2 rounded-lg"
        >
          Сохранить
        </button>
      </div>

      <div className="bg-white border-b border-[#e5e5ea]/80 px-4 py-3 flex gap-1.5 items-center">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-1.5 flex-1">
            <div
              className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                n < step
                  ? 'bg-[#c0392b] border-[#c0392b] text-white'
                  : n === step
                    ? 'border-[#c0392b] text-[#c0392b]'
                    : 'border-[#c7c7cc] text-[#c7c7cc]'
              }`}
            >
              {n < step ? '✓' : n}
            </div>
            {n < 4 && (
              <div className={`flex-1 h-[1.5px] ${n < step ? 'bg-[#c0392b]' : 'bg-[#e5e5ea]'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <div className="bg-white border-b border-[#e5e5ea]/80 px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
            {(
              [
                { id: 'draw' as const, icon: '✏️', label: 'Стены' },
                { id: 'door' as const, icon: '🚪', label: 'Дверь' },
                { id: 'window' as const, icon: '🪟', label: 'Окно' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onDrawTool(t.id)}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border min-w-[48px] ${
                  drawTool === t.id ? 'bg-[#fdf0f0] border-[#c0392b]' : 'bg-white border-[#e5e5ea]'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span className={`text-[8px] font-medium ${drawTool === t.id ? 'text-[#c0392b]' : 'text-[#8e8e93]'}`}>
                  {t.label}
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onUndo}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#e5e5ea] text-[11px] text-[#8e8e93] font-medium whitespace-nowrap"
            >
              ↩ Отмена
            </button>
          </div>

          <div className="relative mx-3 mt-3 bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden">
            {children}
            {showCanvasHint && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/55 text-white text-[10px] font-medium px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
                Коснитесь чтобы начать рисовать стены
              </div>
            )}
          </div>

          <div className="mx-3 mt-3 mb-3 bg-white rounded-xl border border-[#e5e5ea]/80 px-3.5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1c1c1e]">Высота потолка</p>
              <p className="text-[10px] text-[#8e8e93]">для расчёта стен</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onWallHeightChange(Math.max(2, +(wallHeight - 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-lg border border-[#e5e5ea] bg-[#f2f2f7] text-[#c0392b] text-lg font-bold"
              >
                −
              </button>
              <span className="text-[15px] font-bold text-[#1c1c1e] min-w-[52px] text-center">
                {wallHeight.toFixed(2)} м
              </span>
              <button
                type="button"
                onClick={() => onWallHeightChange(Math.min(4, +(wallHeight + 0.1).toFixed(2)))}
                className="w-8 h-8 rounded-lg border border-[#e5e5ea] bg-[#f2f2f7] text-[#c0392b] text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="mx-3 mb-3 bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden">
            <div className="grid grid-cols-3">
              {[
                { val: floorArea.toFixed(1), lbl: 'Пол, м²' },
                { val: wallArea.toFixed(1), lbl: 'Стены, м²' },
                { val: ceilingArea.toFixed(1), lbl: 'Потолок, м²' },
              ].map((cell, i) => (
                <div
                  key={cell.lbl}
                  className={`py-3 text-center ${i < 2 ? 'border-r border-[#e5e5ea]/80' : ''}`}
                >
                  <p className="text-base font-bold text-[#1c1c1e]">{cell.val}</p>
                  <p className="text-[9px] text-[#8e8e93] font-medium uppercase tracking-wide mt-0.5">{cell.lbl}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="pb-4">
          {[
            { title: 'Покрытие пола', mats: FLOOR_MATS, sel: floorMat, onSel: onFloorMat },
            { title: 'Покрытие стен', mats: WALL_MATS, sel: wallMat, onSel: onWallMat },
            { title: 'Потолок', mats: CEIL_MATS, sel: ceilMat, onSel: onCeilMat },
          ].map((group) => (
            <div key={group.title} className="mx-3 mb-3">
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2 px-0.5">
                {group.title}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {group.mats.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => group.onSel(m.id)}
                    className={`flex-shrink-0 min-w-[72px] bg-white border rounded-[10px] px-3 py-2.5 text-center ${
                      group.sel === m.id ? 'border-[#c0392b] bg-[#fdf0f0]' : 'border-[#e5e5ea]'
                    }`}
                  >
                    <div className="text-[22px] mb-1">{m.icon}</div>
                    <div className="text-[10px] font-semibold text-[#1c1c1e]">{m.name}</div>
                    <div className="text-[9px] text-[#8e8e93]">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mx-3 mb-3 bg-white rounded-[10px] border border-[#e5e5ea]/80 px-3.5 py-3">
            <p className="text-[12px] font-semibold text-[#1c1c1e] mb-2">Толщина стяжки / подложки</p>
            <input
              type="range"
              min={1}
              max={15}
              value={floorThick}
              onChange={(e) => onFloorThick(Number(e.target.value))}
              className="w-full accent-[#c0392b]"
            />
            <p className="text-[13px] font-bold text-[#c0392b] text-center mt-1">{floorThick} см</p>
          </div>

          <div className="mx-3 mb-3 bg-white rounded-[10px] border border-[#e5e5ea]/80 px-3.5 py-3">
            <p className="text-[12px] font-semibold text-[#1c1c1e] mb-2">Толщина штукатурки / клея</p>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={wallThick}
              onChange={(e) => onWallThick(Number(e.target.value))}
              className="w-full accent-[#c0392b]"
            />
            <p className="text-[13px] font-bold text-[#c0392b] text-center mt-1">{wallThick} см</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="pb-4">
          <div className="mx-3 mb-3 bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px] bg-[#f2f2f7] border-b border-[#e5e5ea]/80">
              {['Поверхность', 'Кол-во', 'Ед.'].map((h) => (
                <div key={h} className="px-3 py-2 text-[9px] font-bold text-[#8e8e93] uppercase tracking-wide">
                  {h}
                </div>
              ))}
            </div>
            {[
              { name: `${floorLabel?.icon || '🟤'} ${floorLabel?.name || 'Пол'} (пол)`, val: floorArea.toFixed(1), unit: 'м²' },
              { name: '⬜ Подложка', val: floorArea.toFixed(1), unit: 'м²' },
              { name: `${wallLabel?.icon || '🖌️'} ${wallLabel?.name || 'Стены'} (стены)`, val: wallArea.toFixed(1), unit: 'м²' },
              { name: '⬜ Штукатурка', val: plasterVol.toFixed(3), unit: 'м³' },
              { name: `${ceilLabel?.icon || '🖌️'} ${ceilLabel?.name || 'Потолок'} (потолок)`, val: ceilingArea.toFixed(1), unit: 'м²' },
            ].map((row) => (
              <div key={row.name} className="grid grid-cols-[1fr_80px_80px] border-b border-[#f2f2f7] last:border-0">
                <div className="px-3 py-2.5 text-[12px] font-semibold text-[#1c1c1e]">{row.name}</div>
                <div className="px-3 py-2.5 text-[12px] font-bold text-[#c0392b]">{row.val}</div>
                <div className="px-3 py-2.5 text-[11px] text-[#8e8e93]">{row.unit}</div>
              </div>
            ))}
          </div>

          <p className="mx-3 mb-2 text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide">
            Чек-лист работ (дом / квартира)
          </p>
          <div className="mx-3">
            {PLANNER_CHECKLIST.map((item, i) => {
              const groupHeader =
                item.group !== lastGroup ? (
                  ((lastGroup = item.group),
                  (
                    <p
                      key={`g-${item.group}`}
                      className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wide mt-3 mb-1.5 px-0.5"
                    >
                      {item.group}
                    </p>
                  ))
                ) : null
              return (
                <div key={item.id}>
                  {groupHeader}
                  <button
                    type="button"
                    onClick={() => onToggleCheck(item.id)}
                    className="w-full flex items-center gap-2.5 bg-white rounded-[10px] border border-[#e5e5ea]/80 px-3.5 py-2.5 mb-1.5 text-left"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                        checked[item.id] ? 'bg-[#c0392b] border-[#c0392b] text-white' : 'border-[#c7c7cc]'
                      }`}
                    >
                      {checked[item.id] && <span className="text-[11px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1c1c1e]">{item.name}</p>
                      <p className="text-[10px] text-[#8e8e93]">{item.sub}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#8e8e93]">{i + 1}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="pb-4">
          <div className="mx-3 mb-3">
            <p className="text-[12px] font-bold text-[#1c1c1e] mb-2 px-0.5">Мастера рядом по вашей задаче</p>
            {recommendationsLoading ? (
              <p className="text-xs text-[#8e8e93] px-1">Загрузка…</p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {recommendedMasters.length === 0 ? (
                  <p className="text-xs text-[#8e8e93] px-1">Нет мастеров</p>
                ) : (
                  recommendedMasters.map((m) => (
                    <Link
                      key={m.id}
                      href={`/profile/${m.id}`}
                      className="flex-shrink-0 w-[140px] bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden"
                    >
                      <div className="h-[72px] bg-[#f2f2f7] flex items-center justify-center relative">
                        {m.avatar_url ? (
                          <Image src={m.avatar_url} alt="" fill className="object-cover" sizes="140px" />
                        ) : (
                          <span className="text-2xl font-bold text-[#c0392b]">{m.full_name?.[0] || 'М'}</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-[8px] font-bold text-[#c0392b] uppercase mb-0.5">Мастер</p>
                        <p className="text-[11px] font-bold text-[#1c1c1e] truncate">{m.full_name}</p>
                        <p className="text-[9px] text-[#8e8e93] truncate">
                          {m.city || 'Город'} · ★{m.master_rating?.toFixed(1) || '—'}
                        </p>
                      </div>
                      <span className="block mx-2.5 mb-2.5 bg-[#c0392b] text-white text-center text-[10px] font-bold py-1.5 rounded-md">
                        Написать
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mx-3 mb-3">
            <p className="text-[12px] font-bold text-[#1c1c1e] mb-2 px-0.5">Материалы от продавцов в вашем районе</p>
            {recommendationsLoading ? (
              <p className="text-xs text-[#8e8e93] px-1">Загрузка…</p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {recommendedProducts.length === 0 ? (
                  <p className="text-xs text-[#8e8e93] px-1">Нет товаров</p>
                ) : (
                  recommendedProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="flex-shrink-0 w-[140px] bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden"
                    >
                      <div className="h-[72px] bg-[#f2f2f7] flex items-center justify-center relative">
                        {p.images?.[0] ? (
                          <Image src={p.images[0]} alt="" fill className="object-cover" sizes="140px" />
                        ) : (
                          <span className="text-xs text-[#8e8e93]">Фото</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-[8px] font-bold text-[#c0392b] uppercase mb-0.5">Продавец</p>
                        <p className="text-[11px] font-bold text-[#1c1c1e] line-clamp-2 min-h-[28px]">{p.name}</p>
                        <p className="text-[9px] text-[#8e8e93] truncate">
                          {p.seller?.full_name || 'Магазин'} · {p.price.toLocaleString('ru-RU')} ₽
                        </p>
                      </div>
                      <span className="block mx-2.5 mb-2.5 bg-[#f2f2f7] text-[#1c1c1e] text-center text-[10px] font-semibold py-1.5 rounded-md border border-[#e5e5ea]">
                        В каталог
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mx-3 mb-3 bg-white rounded-xl border border-[#e5e5ea]/80 p-3.5 text-center">
            <div className="text-[22px] mb-2">📋</div>
            <p className="text-[13px] font-bold text-[#1c1c1e] mb-1">Создать заказ на основе расчёта</p>
            <p className="text-[11px] text-[#8e8e93] mb-3">Мастера получат уведомление и откликнутся</p>
            <button
              type="button"
              onClick={onCreateOrder}
              className="w-full bg-[#c0392b] text-white text-[13px] font-bold py-3 rounded-[10px]"
            >
              Создать заказ
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-[#e5e5ea]/80 flex gap-2 px-4 py-2 pb-5 z-50">
        {step > 1 && (
          <button
            type="button"
            onClick={prev}
            className="flex-1 bg-[#f2f2f7] border border-[#e5e5ea] text-[#1c1c1e] text-[13px] font-semibold py-3 rounded-[10px]"
          >
            ← Назад
          </button>
        )}
        <button
          type="button"
          onClick={next}
          className={`${step > 1 ? 'flex-[2]' : 'flex-1'} bg-[#c0392b] text-white text-[13px] font-bold py-3 rounded-[10px]`}
        >
          {STEP_NEXT[step - 1]}
        </button>
      </div>
    </div>
  )
}
