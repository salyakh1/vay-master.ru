import type { CalcLine } from './planner-calculations'
import { SURFACE_LABELS, type ObjectTypeId } from './planner-ui-data'

const OBJECT_LABEL: Record<ObjectTypeId, string> = {
  room: 'Комната',
  apartment: 'Квартира',
  house: 'Дом',
  yard: 'Двор / участок',
}

function fmtMoney(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`
}

export function buildEstimateShareText(input: {
  objectType: ObjectTypeId
  floorArea: number
  wallArea: number
  ceilingArea: number
  perimeter: number
  wallHeight: number
  calcLines: CalcLine[]
  materialTotal: number
  workTotal: number
  grandTotal: number
}): string {
  const lines: string[] = [
    `Смета VayMaster — ${OBJECT_LABEL[input.objectType]}`,
    `Площадь ${input.floorArea.toFixed(1)} м² · стены ${input.wallArea.toFixed(1)} м² · высота ${input.wallHeight.toFixed(2)} м`,
    '',
  ]

  if (input.calcLines.length === 0) {
    lines.push('Материалы ещё не выбраны.')
  } else {
    for (const line of input.calcLines) {
      const surface = SURFACE_LABELS[line.surface]
      lines.push(
        `${surface}: ${line.label.replace(/^[^\s]+\s/, '')} — ${line.quantity} ${line.unit} · мат. ${fmtMoney(line.materialTotal)} · работа ${fmtMoney(line.workTotal)}`
      )
    }
    lines.push('')
    lines.push(`Материалы: ${fmtMoney(input.materialTotal)}`)
    lines.push(`Работа: ${fmtMoney(input.workTotal)}`)
    lines.push(`Итого: ${fmtMoney(input.grandTotal)}`)
  }

  lines.push('')
  lines.push('Смета ориентировочная. Точную цену подтвердит мастер.')
  return lines.join('\n')
}

export function buildOrderDraft(input: {
  objectType: ObjectTypeId
  floorArea: number
  wallHeight: number
  calcLines: CalcLine[]
  grandTotal: number
  shareText: string
}): { title: string; description: string; budget: number } {
  const mats = input.calcLines
    .map((l) => l.label.replace(/^[^\s]+\s/, ''))
    .filter(Boolean)
    .slice(0, 3)
  const matPart = mats.length > 0 ? ` (${mats.join(', ')})` : ''
  const title = `Ремонт: ${OBJECT_LABEL[input.objectType].toLowerCase()} ${input.floorArea.toFixed(1)} м²${matPart}`.slice(
    0,
    80
  )

  const description = [
    input.shareText,
    '',
    `Высота потолков ${input.wallHeight.toFixed(2)} м.`,
    'Нужен расчёт и выполнение работ по смете из планировщика.',
  ].join('\n')

  return {
    title,
    description,
    budget: Math.max(0, Math.round(input.grandTotal)),
  }
}

export const PLANNER_ORDER_STORAGE_KEY = 'vay-planner-order'
export const PLANNER_DRAFT_STORAGE_KEY = 'vay-planner-draft'
