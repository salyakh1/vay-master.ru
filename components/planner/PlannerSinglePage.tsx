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
import type { PlannerInputMode, PlannerStep, RecommendedMaster, RecommendedProduct } from './planner-types'
import { SIZE_PRESETS, formatMeters, type PlannerRoom } from './planner-rooms'
import { FiPlus, FiTrash2, FiMinus } from 'react-icons/fi'

type PlannerSinglePageProps = {
  step: PlannerStep
  onStep: (s: PlannerStep) => void
  objectType: ObjectTypeId
  onObjectType: (t: ObjectTypeId) => void
  inputMode: PlannerInputMode
  onInputMode: (m: PlannerInputMode) => void
  roomLength: number
  roomWidth: number
  onRoomLength: (n: number) => void
  onRoomWidth: (n: number) => void
  rooms: PlannerRoom[]
  onAddRoom: () => void
  onUpdateRoom: (id: string, patch: Partial<PlannerRoom>) => void
  onRemoveRoom: (id: string) => void
  hasBottomNav: boolean
  onSave: () => void
  savedHint?: boolean
  drawTool: 'draw' | 'door' | 'window'
  onDrawTool: (t: 'draw' | 'door' | 'window') => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onCloseShape: () => void
  onInsertRectangle: () => void
  canRedo: boolean
  canClose: boolean
  showCanvasHint: boolean
  hintText: string
  closeBlockedReason: string | null
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
  floorThick: number
  wallThick: number
  onFloorThick: (v: number) => void
  onWallThick: (v: number) => void
  surfacePrices: SurfacePrices
  onSurfacePriceChange: (surface: SurfaceId, field: 'material' | 'work', value: number) => void
  calcLines: CalcLine[]
  materialTotal: number
  workTotal: number
  grandTotal: number
  recommendedMasters: RecommendedMaster[]
  recommendedProducts: RecommendedProduct[]
  recommendationsLoading: boolean
  isGuest: boolean
  onCreateOrder: () => void
  onShare: () => void
  shareHint?: string | null
  wallLengths: number[]
  onSetWallLength: (index: number, meters: number) => void
}

const STEPS: { id: PlannerStep; label: string }[] = [
  { id: 0, label: 'Размер' },
  { id: 1, label: 'Материалы' },
  { id: 2, label: 'Смета' },
  { id: 3, label: 'Мастера' },
]

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

function MeterField({
  label,
  value,
  onChange,
  min = 0.5,
  max = 80,
  step = 0.1,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <label className="flex-1 min-w-0">
      {label ? <span className="block text-[12px] font-medium text-[#6b7280] mb-1.5">{label}</span> : null}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Меньше: ${label}`}
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          className="w-11 h-11 flex-shrink-0 rounded-xl border border-[#e5e5ea] bg-[#f4f4f4] text-[#c7362f] flex items-center justify-center"
        >
          <FiMinus size={16} />
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={formatMeters(value)}
          onChange={(e) => {
            const n = parseFloat(e.target.value.replace(',', '.'))
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
          className="flex-1 min-w-0 h-11 rounded-xl border border-[#e5e5ea] text-center text-[16px] font-bold text-[#111]"
        />
        <button
          type="button"
          aria-label={`Больше: ${label}`}
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          className="w-11 h-11 flex-shrink-0 rounded-xl border border-[#e5e5ea] bg-[#f4f4f4] text-[#c7362f] flex items-center justify-center"
        >
          <FiPlus size={16} />
        </button>
      </div>
    </label>
  )
}

export default function PlannerSinglePage(props: PlannerSinglePageProps) {
  const {
    step,
    onStep,
    objectType,
    onObjectType,
    inputMode,
    onInputMode,
    roomLength,
    roomWidth,
    onRoomLength,
    onRoomWidth,
    rooms,
    onAddRoom,
    onUpdateRoom,
    onRemoveRoom,
    hasBottomNav,
    onSave,
    savedHint,
    drawTool,
    onDrawTool,
    onUndo,
    onRedo,
    onClear,
    onCloseShape,
    onInsertRectangle,
    canRedo,
    canClose,
    showCanvasHint,
    hintText,
    closeBlockedReason,
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
    floorThick,
    wallThick,
    onFloorThick,
    onWallThick,
    surfacePrices,
    onSurfacePriceChange,
    calcLines,
    materialTotal,
    workTotal,
    grandTotal,
    recommendedMasters,
    recommendedProducts,
    recommendationsLoading,
    isGuest,
    onCreateOrder,
    onShare,
    shareHint,
    wallLengths,
    onSetWallLength,
  } = props

  const surfaces = SURFACES_BY_OBJECT[objectType]
  const activeMats = MATS_BY_SURFACE[activeSurface] || []
  const selectedMat = activeMats.find((m) => m.id === selections[activeSurface])
  const showBrickParams = selectedMat?.countMode === 'brick' || selectedMat?.countMode === 'block'
  const showVolumeThick = selectedMat?.unit === 'm3'
  const hasSize = floorArea >= 0.3
  const footerBottom = hasBottomNav
    ? 'bottom-[calc(56px+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[env(safe-area-inset-bottom,0px)]'
  const pagePad = hasBottomNav ? 'pb-[calc(168px+env(safe-area-inset-bottom,0px))]' : 'pb-[calc(112px+env(safe-area-inset-bottom,0px))]'

  const ctaLabel =
    step === 0
      ? hasSize
        ? `Далее · ${floorArea.toFixed(1)} м²`
        : 'Укажите размер'
      : step === 1
        ? 'К смете'
        : step === 2
          ? 'Найти мастеров'
          : isGuest
            ? 'Войти и создать заказ'
            : 'Создать заказ'

  const ctaDisabled = step === 0 && !hasSize

  const handleCta = () => {
    if (step < 3) {
      onStep((step + 1) as PlannerStep)
      window.setTimeout(() => {
        document.getElementById('planner-stage')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
      return
    }
    onCreateOrder()
  }

  const planCard = (
    <section className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
      {step === 0 && inputMode === 'draw' && (
        <div className="px-3 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide border-b border-[#f0f0f0]">
          {(
            [
              { id: 'draw' as const, label: 'Стены' },
              { id: 'door' as const, label: 'Дверь' },
              { id: 'window' as const, label: 'Окно' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onDrawTool(t.id)}
              className={`h-10 px-3 rounded-lg text-[13px] font-semibold border whitespace-nowrap ${
                drawTool === t.id ? 'bg-[#fff8f8] border-[#c7362f] text-[#c7362f]' : 'border-[#e5e5ea] text-[#111]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onInsertRectangle}
            className="h-10 px-3 rounded-lg text-[13px] font-semibold border border-[#e5e5ea] whitespace-nowrap"
          >
            Прямоуг.
          </button>
        </div>
      )}
      <div className="relative">
        {children}
        {step === 0 && showCanvasHint && (
          <div className="absolute bottom-3 left-3 right-3 text-center bg-black/70 text-white text-[13px] font-medium px-3 py-2 rounded-full pointer-events-none">
            {hintText}
          </div>
        )}
        {step === 0 && closeBlockedReason && (
          <div className="absolute left-3 right-3 top-3 px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-[12px]">
            {closeBlockedReason}
          </div>
        )}
      </div>
      {step === 0 && inputMode === 'draw' && (
        <>
          <div className="grid grid-cols-4 gap-1 p-2 border-t border-[#f0f0f0]">
            <button type="button" onClick={onUndo} className="h-11 rounded-lg bg-[#f4f4f4] text-[12px] font-semibold">
              Назад
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-11 rounded-lg bg-[#f4f4f4] text-[12px] font-semibold disabled:opacity-40"
            >
              Вперёд
            </button>
            <button
              type="button"
              onClick={onCloseShape}
              disabled={!canClose}
              className="h-11 rounded-lg bg-[#111] text-white text-[12px] font-bold disabled:opacity-40"
            >
              Замкнуть
            </button>
            <button type="button" onClick={onClear} className="h-11 rounded-lg bg-[#f4f4f4] text-[12px] font-semibold text-[#c7362f]">
              Сброс
            </button>
          </div>
          {wallLengths.length > 0 && (
            <div className="px-3 pb-3 space-y-3 border-t border-[#f0f0f0] pt-3">
              <p className="text-[13px] font-semibold text-[#111]">Длины стен — правьте цифрами</p>
              {wallLengths.map((len, i) => (
                <div key={`wall-${i}`} className="flex items-center gap-3 py-1">
                  <span className="w-16 text-[12px] font-medium text-[#6b7280] flex-shrink-0">Стена {i + 1}</span>
                  <MeterField label="" value={Math.round(len * 10) / 10} onChange={(n) => onSetWallLength(i, n)} min={0.3} max={20} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {step !== 0 && (
        <p className="px-3 py-2 text-[13px] text-[#6b7280] text-center border-t border-[#f0f0f0]">
          План {floorArea.toFixed(1)} м²
          {grandTotal > 0 ? ` · ${fmt(grandTotal)} ₽` : ''}
        </p>
      )}
    </section>
  )

  return (
    <div className={`min-h-screen bg-[#f4f4f4] max-w-lg mx-auto w-full ${pagePad}`}>
      <div className="sticky top-[52px] z-40 bg-white border-b border-[#e5e5ea]">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-[17px] font-bold text-[#111] leading-tight">Планировщик сметы</h1>
          <p className="text-[12px] text-[#6b7280] mt-0.5">Размер → материалы → мастера рядом</p>
        </div>
        <div className="grid grid-cols-4 px-1">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStep(s.id)}
              className={`relative py-2.5 text-[12px] font-semibold ${
                step === s.id ? 'text-[#c7362f]' : 'text-[#9ca3af]'
              }`}
            >
              {s.label}
              <span
                className={`absolute left-2 right-2 bottom-0 h-0.5 rounded-full ${
                  step === s.id ? 'bg-[#c7362f]' : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>
        {step !== 0 && <div className="px-3 pb-2.5 pt-1 bg-[#f4f4f4] border-t border-[#ececec]">{planCard}</div>}
      </div>

      {savedHint && (
        <div className="mx-3 mt-3 px-3 py-2.5 bg-[#ecfdf3] text-[#166534] text-[13px] font-medium rounded-xl text-center">
          Черновик сохранён на этом телефоне
        </div>
      )}
      {shareHint && (
        <div className="mx-3 mt-3 px-3 py-2.5 bg-[#eef6ff] text-[#1d4ed8] text-[13px] font-medium rounded-xl text-center">
          {shareHint}
        </div>
      )}

      {step === 0 && (
      <div className="px-3 pt-3 space-y-3">
            <section className="bg-white rounded-2xl border border-[#ececec] p-3">
              <p className="text-[12px] font-semibold text-[#6b7280] mb-2">Что считаем</p>
              <div className="grid grid-cols-4 gap-2">
                {OBJECT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onObjectType(t.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border min-h-[72px] ${
                      objectType === t.id ? 'bg-[#fff8f8] border-[#c7362f]' : 'bg-[#fafafa] border-[#ececec]'
                    }`}
                  >
                    <span className="text-xl leading-none">{t.icon}</span>
                    <span className={`text-[11px] font-semibold ${objectType === t.id ? 'text-[#c7362f]' : 'text-[#111]'}`}>
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onInputMode('size')}
                className={`h-12 rounded-xl border text-[14px] font-bold ${
                  inputMode === 'size' ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#111] border-[#e5e5ea]'
                }`}
              >
                Размеры
              </button>
              <button
                type="button"
                onClick={() => onInputMode('draw')}
                className={`h-12 rounded-xl border text-[14px] font-bold ${
                  inputMode === 'draw' ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-[#111] border-[#e5e5ea]'
                }`}
              >
                Нарисовать
              </button>
            </div>
        {planCard}
      </div>
      )}

      {step === 0 && (
        <div className="px-3 pt-3 space-y-3">
          {inputMode === 'size' && (
            <section className="bg-white rounded-2xl border border-[#ececec] p-3 space-y-3">
              {objectType === 'apartment' ? (
                <>
                  <p className="text-[13px] text-[#6b7280]">Добавьте комнаты — площадь сложится сама.</p>
                  {rooms.map((room, idx) => (
                    <div key={room.id} className="rounded-xl border border-[#ececec] p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={room.name}
                          onChange={(e) => onUpdateRoom(room.id, { name: e.target.value })}
                          className="flex-1 h-10 px-3 rounded-lg border border-[#e5e5ea] text-[14px] font-semibold"
                          placeholder={`Комната ${idx + 1}`}
                        />
                        {rooms.length > 1 && (
                          <button
                            type="button"
                            aria-label="Удалить комнату"
                            onClick={() => onRemoveRoom(room.id)}
                            className="w-10 h-10 rounded-lg border border-[#e5e5ea] text-[#c7362f] flex items-center justify-center"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <MeterField
                          label="Длина, м"
                          value={room.length}
                          onChange={(n) => onUpdateRoom(room.id, { length: n })}
                        />
                        <MeterField
                          label="Ширина, м"
                          value={room.width}
                          onChange={(n) => onUpdateRoom(room.id, { width: n })}
                        />
                      </div>
                      <p className="text-[12px] text-[#6b7280]">
                        {room.name || 'Комната'}: {(room.length * room.width).toFixed(1)} м²
                      </p>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={onAddRoom}
                    className="w-full h-11 rounded-xl border border-dashed border-[#c7362f]/40 text-[#c7362f] text-[14px] font-bold"
                  >
                    + Ещё комната
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-[#6b7280]">
                    {objectType === 'yard' ? 'Длина и ширина площадки' : 'Длина и ширина помещения'}
                  </p>
                  <div className="flex gap-2">
                    <MeterField label="Длина, м" value={roomLength} onChange={onRoomLength} />
                    <MeterField label="Ширина, м" value={roomWidth} onChange={onRoomWidth} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                    {SIZE_PRESETS.filter((p) => (objectType === 'yard' ? p.id === 'plot' || p.id === 'garage' : p.id !== 'plot')).map(
                      (p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onRoomLength(p.length)
                            onRoomWidth(p.width)
                          }}
                          className="flex-shrink-0 h-10 px-3 rounded-full border border-[#e5e5ea] bg-[#fafafa] text-[12px] font-semibold text-[#111]"
                        >
                          {p.name}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          <section className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
            <p className="text-[12px] font-semibold text-[#6b7280] px-3 pt-3 pb-1">Считается автоматически</p>
            <div className="grid grid-cols-2">
              {[
                { val: floorArea.toFixed(1), lbl: objectType === 'yard' ? 'Площадь, м²' : 'Пол, м²' },
                { val: objectType === 'yard' ? '—' : ceilingArea.toFixed(1), lbl: 'Потолок, м²' },
                { val: objectType === 'yard' ? '—' : wallArea.toFixed(1), lbl: 'Стены, м²' },
                { val: perimeter.toFixed(1), lbl: 'Периметр, м' },
              ].map((cell, i) => (
                <div
                  key={cell.lbl}
                  className={`py-3.5 text-center ${i % 2 === 0 ? 'border-r border-[#f0f0f0]' : ''} ${i < 2 ? 'border-b border-[#f0f0f0]' : ''}`}
                >
                  <p className="text-[20px] font-bold text-[#111] tabular-nums">{cell.val}</p>
                  <p className="text-[11px] text-[#6b7280] mt-0.5">{cell.lbl}</p>
                </div>
              ))}
            </div>
          </section>

          {objectType !== 'yard' && (
            <section className="bg-white rounded-2xl border border-[#ececec] px-3 py-3 space-y-2">
              <div>
                <p className="text-[14px] font-semibold text-[#111]">Высота потолка</p>
                <p className="text-[12px] text-[#6b7280]">Нужна для площади стен</p>
              </div>
              <MeterField label="" value={wallHeight} onChange={onWallHeightChange} min={2} max={6} step={0.05} />
            </section>
          )}
        </div>
      )}

      <div id="planner-stage">
      {step === 1 && (
        <div className="px-3 pt-3 space-y-3">
          {!hasSize && (
            <button
              type="button"
              onClick={() => onStep(0)}
              className="w-full text-left bg-[#fff8f8] border border-[#c7362f]/30 rounded-2xl p-3 text-[13px] text-[#c7362f] font-medium"
            >
              Сначала укажите размер помещения →
            </button>
          )}
          <section>
            <p className="text-[12px] font-semibold text-[#6b7280] mb-2 px-0.5">Что ремонтируем</p>
            <div className="flex flex-wrap gap-2">
              {surfaces.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onToggleSurface(s)
                    onActiveSurface(s)
                  }}
                  className={`h-11 px-4 rounded-xl border text-[13px] font-semibold ${
                    enabledSurfaces[s]
                      ? 'bg-[#fff8f8] border-[#c7362f] text-[#c7362f]'
                      : 'bg-white border-[#e5e5ea] text-[#6b7280]'
                  }`}
                >
                  {SURFACE_LABELS[s]}
                </button>
              ))}
            </div>
          </section>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {surfaces
              .filter((s) => enabledSurfaces[s])
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onActiveSurface(s)}
                  className={`flex-shrink-0 h-10 px-4 rounded-full text-[13px] font-semibold ${
                    activeSurface === s ? 'bg-[#c7362f] text-white' : 'bg-white border border-[#e5e5ea] text-[#111]'
                  }`}
                >
                  {SURFACE_LABELS[s]}
                </button>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {activeMats.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMaterial(activeSurface, m.id)}
                className={`min-h-[88px] bg-white border rounded-2xl px-3 py-3 text-left ${
                  selections[activeSurface] === m.id ? 'border-[#c7362f] bg-[#fff8f8]' : 'border-[#ececec]'
                }`}
              >
                <div className="text-[22px] mb-1">{m.icon}</div>
                <div className="text-[13px] font-bold text-[#111] leading-tight">{m.name}</div>
                <div className="text-[11px] text-[#6b7280] mt-1">{m.sub}</div>
              </button>
            ))}
          </div>

          {selectedMat && enabledSurfaces[activeSurface] && (
            <section className="bg-white rounded-2xl border border-[#ececec] px-3 py-3 space-y-3">
              <p className="text-[14px] font-semibold text-[#111]">Цена за {unitLabel(selectedMat.unit)}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[12px] text-[#6b7280]">
                  Материал, ₽
                  <input
                    type="text"
                    inputMode="numeric"
                    value={surfacePrices[activeSurface]?.material ?? ''}
                    onChange={(e) =>
                      onSurfacePriceChange(activeSurface, 'material', Number(e.target.value.replace(/\s/g, '')) || 0)
                    }
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-[#e5e5ea] text-[16px] font-semibold text-[#111]"
                  />
                </label>
                <label className="text-[12px] text-[#6b7280]">
                  Работа, ₽
                  <input
                    type="text"
                    inputMode="numeric"
                    value={surfacePrices[activeSurface]?.work ?? ''}
                    onChange={(e) =>
                      onSurfacePriceChange(activeSurface, 'work', Number(e.target.value.replace(/\s/g, '')) || 0)
                    }
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-[#e5e5ea] text-[16px] font-semibold text-[#111]"
                  />
                </label>
              </div>
            </section>
          )}

          {showVolumeThick && (
            <section className="bg-white rounded-2xl border border-[#ececec] px-3 py-3">
              <p className="text-[14px] font-semibold text-[#111] mb-2">Толщина слоя, см</p>
              {activeSurface === 'floor' ? (
                <MeterField label="" value={floorThick} onChange={onFloorThick} min={1} max={30} step={0.5} />
              ) : (
                <MeterField label="" value={wallThick} onChange={onWallThick} min={0.5} max={20} step={0.5} />
              )}
            </section>
          )}

          {showBrickParams && (
            <section className="bg-white rounded-2xl border border-[#ececec] px-3 py-3 space-y-3">
              <p className="text-[14px] font-semibold text-[#111]">
                Размер {selectedMat?.countMode === 'block' ? 'блока' : 'кирпича'}, мм
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'l' as const, label: 'Длина' },
                    { key: 'h' as const, label: 'Высота' },
                    { key: 'w' as const, label: 'Ширина' },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="text-[12px] text-[#6b7280]">
                    {label}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={brickSize[key]}
                      onChange={(e) => onBrickSize({ ...brickSize, [key]: Number(e.target.value) || 0 })}
                      className="mt-1 w-full h-11 px-2 rounded-xl border border-[#e5e5ea] text-[15px] font-semibold"
                    />
                  </label>
                ))}
              </div>
              <label className="block text-[12px] text-[#6b7280]">
                Шов, мм
                <input
                  type="text"
                  inputMode="numeric"
                  value={brickSize.joint}
                  onChange={(e) => onBrickSize({ ...brickSize, joint: Number(e.target.value) || 0 })}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-[#e5e5ea] text-[15px] font-semibold"
                />
              </label>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-[#ececec] px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-semibold text-[#111]">Запас на подрезку</p>
              <p className="text-[15px] font-bold text-[#c7362f]">{wastePercent}%</p>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={wastePercent}
              onChange={(e) => onWastePercent(Number(e.target.value))}
              className="w-full accent-[#c7362f] h-11"
            />
          </section>
        </div>
      )}

      {step === 2 && (
        <div className="px-3 pt-3 space-y-3">
          <section className="bg-white rounded-2xl border border-[#ececec] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0f0f0]">
              <p className="text-[15px] font-bold text-[#111]">Ориентировочная смета</p>
              <p className="text-[12px] text-[#6b7280] mt-0.5">Цены средние по рынку, мастер уточнит на месте</p>
            </div>
            {calcLines.length === 0 ? (
              <button type="button" onClick={() => onStep(hasSize ? 1 : 0)} className="w-full px-4 py-8 text-[14px] text-[#6b7280]">
                {hasSize ? 'Выберите материалы →' : 'Сначала укажите размер →'}
              </button>
            ) : (
              <ul>
                {calcLines.map((line) => (
                  <li key={line.id} className="px-4 py-3 border-b border-[#f5f5f5]">
                    <div className="flex justify-between gap-3">
                      <p className="text-[14px] font-semibold text-[#111]">
                        {SURFACE_LABELS[line.surface]} · {line.label}
                      </p>
                      <p className="text-[14px] font-bold text-[#111] whitespace-nowrap">
                        {fmt(line.materialTotal + line.workTotal)} ₽
                      </p>
                    </div>
                    <p className="text-[12px] text-[#6b7280] mt-1">
                      {line.quantity} {line.unit}
                      {line.note ? ` · ${line.note}` : ''} · мат. {fmt(line.materialTotal)} · раб. {fmt(line.workTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-4 py-3 space-y-1.5 bg-[#fafafa]">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Материалы</span>
                <span className="font-bold">{fmt(materialTotal)} ₽</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Работа</span>
                <span className="font-bold">{fmt(workTotal)} ₽</span>
              </div>
              <div className="flex justify-between text-[16px] pt-2 border-t border-[#ececec]">
                <span className="font-bold">Итого</span>
                <span className="font-bold text-[#c7362f]">{fmt(grandTotal)} ₽</span>
              </div>
            </div>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onShare}
              className="h-12 rounded-xl border border-[#e5e5ea] bg-white text-[14px] font-bold text-[#111]"
            >
              Поделиться
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-12 rounded-xl border border-[#e5e5ea] bg-white text-[14px] font-bold text-[#111]"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="px-3 pt-3 space-y-4">
          <p className="text-[13px] text-[#6b7280] px-0.5">
            По смете подбираем мастеров и материалы с площадки. Итого {fmt(grandTotal)} ₽.
          </p>
          <section>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <p className="text-[15px] font-bold text-[#111]">Мастера</p>
              <Link href="/search" className="text-[13px] font-semibold text-[#c7362f]">
                Все →
              </Link>
            </div>
            {recommendationsLoading ? (
              <p className="text-[13px] text-[#6b7280] py-4">Ищем подходящих…</p>
            ) : recommendedMasters.length === 0 ? (
              <Link href="/search" className="block bg-white rounded-2xl border border-dashed border-[#e5e5ea] p-4 text-[13px] text-[#6b7280]">
                Пока нет точных совпадений — откройте поиск мастеров
              </Link>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {recommendedMasters.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profile/${m.id}`}
                    className="flex-shrink-0 w-[148px] bg-white rounded-2xl border border-[#ececec] overflow-hidden"
                  >
                    <div className="h-[84px] bg-[#f4f4f4] relative">
                      {m.avatar_url ? (
                        <Image src={m.avatar_url} alt="" fill className="object-cover" sizes="148px" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#c7362f]">
                          {m.full_name?.[0] || 'М'}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[13px] font-bold text-[#111] truncate">{m.full_name}</p>
                      <p className="text-[12px] text-[#6b7280] mt-0.5">
                        ★ {m.master_rating?.toFixed(1) || '—'}
                        {m.city ? ` · ${m.city}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <p className="text-[15px] font-bold text-[#111]">Материалы в каталоге</p>
              <Link href="/products" className="text-[13px] font-semibold text-[#c7362f]">
                Каталог →
              </Link>
            </div>
            {recommendationsLoading ? (
              <p className="text-[13px] text-[#6b7280] py-4">Подбираем товары…</p>
            ) : recommendedProducts.length === 0 ? (
              <Link href="/products" className="block bg-white rounded-2xl border border-dashed border-[#e5e5ea] p-4 text-[13px] text-[#6b7280]">
                Товаров по смете пока нет — откройте каталог
              </Link>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                {recommendedProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="flex-shrink-0 w-[148px] bg-white rounded-2xl border border-[#ececec] overflow-hidden"
                  >
                    <div className="h-[84px] bg-[#f4f4f4] relative">
                      {p.images?.[0] ? (
                        <Image src={p.images[0]} alt="" fill className="object-cover" sizes="148px" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[12px] text-[#9ca3af]">Фото</span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[13px] font-bold text-[#111] line-clamp-2 min-h-[36px]">{p.name}</p>
                      <p className="text-[13px] font-bold text-[#c7362f] mt-1">{p.price.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      </div>

      <div className={`fixed left-0 right-0 z-50 max-w-lg mx-auto bg-white border-t border-[#e5e5ea] px-3 pt-2.5 pb-3 ${footerBottom}`}>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-[12px] text-[#6b7280]">
            {floorArea.toFixed(1)} м²
            {grandTotal > 0 ? ` · ${fmt(grandTotal)} ₽` : ''}
          </span>
          {step > 0 && (
            <button type="button" onClick={() => onStep((step - 1) as PlannerStep)} className="text-[13px] font-semibold text-[#111]">
              Назад
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={ctaDisabled}
          onClick={handleCta}
          className="w-full h-12 rounded-xl bg-[#c7362f] text-white text-[15px] font-bold disabled:opacity-40"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
