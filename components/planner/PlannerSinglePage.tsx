'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { CalcLine, BrickSize } from './planner-calculations'
import {
  OBJECT_TYPES,
  SURFACE_LABELS,
  SURFACES_BY_OBJECT,
  MATS_BY_SURFACE,
  unitLabel,
  type ObjectTypeId,
  type SurfaceId,
  type SurfacePrices,
} from './planner-ui-data'
import type { RecommendedMaster, RecommendedProduct } from './planner-types'

type PlannerSinglePageProps = {
  objectType: ObjectTypeId
  onObjectType: (t: ObjectTypeId) => void
  onBack: () => void
  onSave: () => void
  savedHint?: boolean
  drawTool: 'draw' | 'door' | 'window'
  onDrawTool: (t: 'draw' | 'door' | 'window') => void
  onUndo: () => void
  showCanvasHint: boolean
  children: React.ReactNode
  floorArea: number
  wallArea: number
  ceilingArea: number
  perimeter: number
  wallHeight: number
  onWallHeightChange: (h: number) => void
  activeSurface: SurfaceId
  onActiveSurface: (s: SurfaceId) => void
  enabledSurfaces: Record<SurfaceId, boolean>
  onToggleSurface: (s: SurfaceId) => void
  selections: Partial<Record<SurfaceId, string>>
  onSelectMaterial: (surface: SurfaceId, matId: string) => void
  brickSize: BrickSize
  onBrickSize: (size: BrickSize) => void
  wastePercent: number
  onWastePercent: (v: number) => void
  surfacePrices: SurfacePrices
  onSurfacePriceChange: (surface: SurfaceId, field: 'material' | 'work', value: number) => void
  calcLines: CalcLine[]
  materialTotal: number
  workTotal: number
  grandTotal: number
  recommendedMasters: RecommendedMaster[]
  recommendedProducts: RecommendedProduct[]
  recommendationsLoading: boolean
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

export default function PlannerSinglePage({
  objectType,
  onObjectType,
  onBack,
  onSave,
  savedHint,
  drawTool,
  onDrawTool,
  onUndo,
  showCanvasHint,
  children,
  floorArea,
  wallArea,
  ceilingArea,
  perimeter,
  wallHeight,
  onWallHeightChange,
  activeSurface,
  onActiveSurface,
  enabledSurfaces,
  onToggleSurface,
  selections,
  onSelectMaterial,
  brickSize,
  onBrickSize,
  wastePercent,
  onWastePercent,
  surfacePrices,
  onSurfacePriceChange,
  calcLines,
  materialTotal,
  workTotal,
  grandTotal,
  recommendedMasters,
  recommendedProducts,
  recommendationsLoading,
}: PlannerSinglePageProps) {
  const surfaces = SURFACES_BY_OBJECT[objectType]
  const activeMats = MATS_BY_SURFACE[activeSurface] || []
  const selectedMat = activeMats.find((m) => m.id === selections[activeSurface])
  const showBrickParams =
    selectedMat?.countMode === 'brick' || selectedMat?.countMode === 'block'

  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-36">
      <div className="sticky top-0 z-50 bg-white border-b border-[#e5e5ea]/80 px-4 py-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-[#f2f2f7] border border-[#e5e5ea] flex items-center justify-center text-[#c0392b] text-base"
          aria-label="Назад"
        >
          ←
        </button>
        <h1 className="text-[15px] font-bold text-[#1c1c1e] flex-1">Планировщик</h1>
        <button
          type="button"
          onClick={onSave}
          className="bg-[#c0392b] text-white text-[11px] font-semibold px-3.5 py-2 rounded-lg"
        >
          Сохранить
        </button>
      </div>

      {savedHint && (
        <div className="mx-3 mt-2 px-3 py-2 bg-[#e8f5e9] text-[#2e7d32] text-[11px] font-medium rounded-lg text-center">
          Расчёт сохранён локально на устройстве
        </div>
      )}

      {/* Object type */}
      <div className="bg-white border-b border-[#e5e5ea]/80 px-3 py-2.5">
        <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2 px-1">
          Тип объекта
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {OBJECT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onObjectType(t.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border min-w-[72px] ${
                objectType === t.id ? 'bg-[#fdf0f0] border-[#c0392b]' : 'bg-white border-[#e5e5ea]'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span
                className={`text-[10px] font-semibold ${objectType === t.id ? 'text-[#c0392b]' : 'text-[#1c1c1e]'}`}
              >
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas tools */}
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
            Коснитесь чтобы начать рисовать
          </div>
        )}
      </div>

      {/* Dimensions */}
      <div className="mx-3 mt-3 bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide px-3 pt-3 pb-1">
          Размеры (авто)
        </p>
        <div className="grid grid-cols-2">
          {[
            { val: floorArea.toFixed(1), lbl: 'Пол, м²' },
            { val: ceilingArea.toFixed(1), lbl: 'Потолок, м²' },
            { val: wallArea.toFixed(1), lbl: 'Стены, м²' },
            { val: perimeter.toFixed(1), lbl: 'Периметр, м' },
          ].map((cell, i) => (
            <div
              key={cell.lbl}
              className={`py-3 text-center ${i % 2 === 0 ? 'border-r border-[#e5e5ea]/80' : ''} ${i < 2 ? 'border-b border-[#e5e5ea]/80' : ''}`}
            >
              <p className="text-base font-bold text-[#1c1c1e]">{cell.val}</p>
              <p className="text-[9px] text-[#8e8e93] font-medium uppercase tracking-wide mt-0.5">{cell.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-3 mt-3 bg-white rounded-xl border border-[#e5e5ea]/80 px-3.5 py-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#1c1c1e]">Высота стен</p>
          <p className="text-[10px] text-[#8e8e93]">для расчёта площади</p>
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
            onClick={() => onWallHeightChange(Math.min(6, +(wallHeight + 0.1).toFixed(2)))}
            className="w-8 h-8 rounded-lg border border-[#e5e5ea] bg-[#f2f2f7] text-[#c0392b] text-lg font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* What to calculate */}
      <div className="mx-3 mt-3">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2 px-0.5">
          Что рассчитываем
        </p>
        <div className="flex flex-wrap gap-2">
          {surfaces.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onToggleSurface(s)
                onActiveSurface(s)
              }}
              className={`px-3 py-2 rounded-lg border text-[11px] font-semibold ${
                enabledSurfaces[s]
                  ? 'bg-[#fdf0f0] border-[#c0392b] text-[#c0392b]'
                  : 'bg-white border-[#e5e5ea] text-[#8e8e93]'
              }`}
            >
              {SURFACE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Surface tabs for materials */}
      <div className="mx-3 mt-3">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2 px-0.5">
          Материалы
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide mb-2">
          {surfaces
            .filter((s) => enabledSurfaces[s])
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onActiveSurface(s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                  activeSurface === s
                    ? 'bg-[#c0392b] border-[#c0392b] text-white'
                    : 'bg-white border-[#e5e5ea] text-[#1c1c1e]'
                }`}
              >
                {SURFACE_LABELS[s]}
              </button>
            ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {activeMats.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMaterial(activeSurface, m.id)}
              className={`flex-shrink-0 min-w-[80px] bg-white border rounded-[10px] px-3 py-2.5 text-center ${
                selections[activeSurface] === m.id ? 'border-[#c0392b] bg-[#fdf0f0]' : 'border-[#e5e5ea]'
              }`}
            >
              <div className="text-[22px] mb-1">{m.icon}</div>
              <div className="text-[10px] font-semibold text-[#1c1c1e]">{m.name}</div>
              <div className="text-[8px] text-[#8e8e93] mt-0.5">{m.sub}</div>
            </button>
          ))}
        </div>

        {selectedMat && enabledSurfaces[activeSurface] && (
          <div className="mt-3 bg-white rounded-xl border border-[#e5e5ea]/80 px-3.5 py-3">
            <p className="text-[12px] font-semibold text-[#1c1c1e] mb-2">
              Цены за {unitLabel(selectedMat.unit)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-[#8e8e93]">
                Материал, ₽
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={surfacePrices[activeSurface]?.material ?? ''}
                  placeholder="0"
                  onChange={(e) =>
                    onSurfacePriceChange(activeSurface, 'material', Number(e.target.value) || 0)
                  }
                  className="mt-1 w-full h-9 px-2 rounded-lg border border-[#e5e5ea] text-[12px] font-semibold text-[#1c1c1e]"
                />
              </label>
              <label className="text-[10px] text-[#8e8e93]">
                Работа, ₽
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={surfacePrices[activeSurface]?.work ?? ''}
                  placeholder="0"
                  onChange={(e) =>
                    onSurfacePriceChange(activeSurface, 'work', Number(e.target.value) || 0)
                  }
                  className="mt-1 w-full h-9 px-2 rounded-lg border border-[#e5e5ea] text-[12px] font-semibold text-[#1c1c1e]"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Brick / block params for house facade */}
      {showBrickParams && (
        <div className="mx-3 mt-3 bg-white rounded-xl border border-[#e5e5ea]/80 px-3.5 py-3 space-y-3">
          <p className="text-[12px] font-semibold text-[#1c1c1e]">
            Размер {selectedMat?.countMode === 'block' ? 'блока' : 'кирпича'} (мм)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'l' as const, label: 'Длина' },
                { key: 'h' as const, label: 'Высота' },
                { key: 'w' as const, label: 'Ширина' },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="text-[10px] text-[#8e8e93]">
                {label}
                <input
                  type="number"
                  min={1}
                  value={brickSize[key]}
                  onChange={(e) =>
                    onBrickSize({ ...brickSize, [key]: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full h-9 px-2 rounded-lg border border-[#e5e5ea] text-[12px] font-semibold text-[#1c1c1e]"
                />
              </label>
            ))}
          </div>
          <label className="block text-[10px] text-[#8e8e93]">
            Шов, мм
            <input
              type="number"
              min={0}
              max={20}
              value={brickSize.joint}
              onChange={(e) => onBrickSize({ ...brickSize, joint: Number(e.target.value) || 0 })}
              className="mt-1 w-full h-9 px-2 rounded-lg border border-[#e5e5ea] text-[12px] font-semibold text-[#1c1c1e]"
            />
          </label>
        </div>
      )}

      <div className="mx-3 mt-3 bg-white rounded-[10px] border border-[#e5e5ea]/80 px-3.5 py-3">
        <p className="text-[12px] font-semibold text-[#1c1c1e] mb-2">Запас материала (%)</p>
        <input
          type="range"
          min={0}
          max={20}
          value={wastePercent}
          onChange={(e) => onWastePercent(Number(e.target.value))}
          className="w-full accent-[#c0392b]"
        />
        <p className="text-[13px] font-bold text-[#c0392b] text-center mt-1">{wastePercent}%</p>
      </div>

      {/* Cost table */}
      <div className="mx-3 mt-3 bg-white rounded-xl border border-[#e5e5ea]/80 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-[#e5e5ea]/80 bg-[#f2f2f7]">
          <p className="text-[12px] font-bold text-[#1c1c1e]">Стоимость</p>
        </div>
        {calcLines.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-[#8e8e93]">Нарисуйте контур и выберите материалы</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_56px_72px_72px] bg-[#f2f2f7] border-b border-[#e5e5ea]/80 text-[8px] font-bold text-[#8e8e93] uppercase">
              <div className="px-2 py-2">Позиция</div>
              <div className="px-1 py-2 text-center">Кол-во</div>
              <div className="px-1 py-2 text-right">Мат.</div>
              <div className="px-1 py-2 text-right">Раб.</div>
            </div>
            {calcLines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[1fr_56px_72px_72px] border-b border-[#f2f2f7] last:border-0 text-[11px]"
              >
                <div className="px-2 py-2.5 min-w-0">
                  <p className="font-semibold text-[#1c1c1e] truncate">{line.label}</p>
                  {line.note && <p className="text-[9px] text-[#8e8e93] mt-0.5">{line.note}</p>}
                </div>
                <div className="px-1 py-2.5 text-center font-bold text-[#c0392b]">
                  {line.quantity}
                  <span className="block text-[8px] text-[#8e8e93] font-normal">{line.unit}</span>
                </div>
                <div className="px-1 py-2.5 text-right font-semibold text-[#1c1c1e]">
                  {fmt(line.materialTotal)} ₽
                </div>
                <div className="px-1 py-2.5 text-right font-semibold text-[#1c1c1e]">
                  {fmt(line.workTotal)} ₽
                </div>
              </div>
            ))}
            <div className="px-3 py-3 space-y-1 bg-[#fafafa]">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8e8e93]">Материалы</span>
                <span className="font-bold text-[#1c1c1e]">{fmt(materialTotal)} ₽</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8e8e93]">Работа</span>
                <span className="font-bold text-[#1c1c1e]">{fmt(workTotal)} ₽</span>
              </div>
              <div className="flex justify-between text-[13px] pt-1 border-t border-[#e5e5ea]/80">
                <span className="font-bold text-[#1c1c1e]">Итого</span>
                <span className="font-bold text-[#c0392b]">{fmt(grandTotal)} ₽</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recommendations */}
      <div className="mx-3 mt-4 mb-2">
        <p className="text-[12px] font-bold text-[#1c1c1e] mb-2 px-0.5">Рекомендации</p>

        <p className="text-[10px] font-semibold text-[#8e8e93] uppercase mb-1.5 px-0.5">Мастера</p>
        {recommendationsLoading ? (
          <p className="text-xs text-[#8e8e93] px-1 mb-3">Загрузка…</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide mb-3">
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
                    <p className="text-[11px] font-bold text-[#1c1c1e] truncate">{m.full_name}</p>
                    <p className="text-[9px] text-[#8e8e93]">
                      ★{m.master_rating?.toFixed(1) || '—'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        <p className="text-[10px] font-semibold text-[#8e8e93] uppercase mb-1.5 px-0.5">Материалы</p>
        {recommendationsLoading ? (
          <p className="text-xs text-[#8e8e93] px-1">Загрузка…</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
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
                    <p className="text-[11px] font-bold text-[#1c1c1e] line-clamp-2">{p.name}</p>
                    <p className="text-[9px] text-[#8e8e93]">{p.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sticky totals */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-[#e5e5ea]/80 px-4 py-3 pb-5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-2 text-[11px]">
          <span className="text-[#8e8e93]">
            Мат. {fmt(materialTotal)} ₽ · Раб. {fmt(workTotal)} ₽
          </span>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="w-full bg-[#c0392b] text-white text-[13px] font-bold py-3 rounded-[10px]"
        >
          Сохранить расчёт · {fmt(grandTotal)} ₽
        </button>
      </div>
    </div>
  )
}
