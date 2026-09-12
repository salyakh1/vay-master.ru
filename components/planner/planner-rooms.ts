export type PlannerRoom = {
  id: string
  name: string
  length: number
  width: number
}

export type SizePreset = {
  id: string
  name: string
  length: number
  width: number
  hint?: string
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'bath', name: 'Ванная', length: 1.7, width: 1.7, hint: '1.7×1.7' },
  { id: 'toilet', name: 'Туалет', length: 1.2, width: 0.9, hint: '1.2×0.9' },
  { id: 'kitchen', name: 'Кухня', length: 3, width: 2.5, hint: '3×2.5' },
  { id: 'bedroom', name: 'Спальня', length: 4, width: 3.2, hint: '4×3.2' },
  { id: 'living', name: 'Гостиная', length: 5.5, width: 4, hint: '5.5×4' },
  { id: 'hallway', name: 'Коридор', length: 4, width: 1.2, hint: '4×1.2' },
  { id: 'garage', name: 'Гараж', length: 6, width: 3.5, hint: '6×3.5' },
  { id: 'plot', name: 'Площадка 8×6', length: 8, width: 6, hint: 'двор' },
]

export function parseMeters(raw: string): number {
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(200, Math.round(n * 100) / 100)
}

export function clampMeters(n: number, min = 0.5, max = 80): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100))
}

export function newRoomId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function defaultRoom(name = 'Комната 1'): PlannerRoom {
  return { id: newRoomId(), name, length: 4, width: 3 }
}

export function roomArea(room: Pick<PlannerRoom, 'length' | 'width'>): number {
  return Math.max(0, room.length) * Math.max(0, room.width)
}

export function roomPerimeter(room: Pick<PlannerRoom, 'length' | 'width'>): number {
  return 2 * (Math.max(0, room.length) + Math.max(0, room.width))
}

export function roomsTotals(rooms: PlannerRoom[]): { area: number; perimeter: number } {
  return rooms.reduce(
    (acc, room) => ({
      area: acc.area + roomArea(room),
      perimeter: acc.perimeter + roomPerimeter(room),
    }),
    { area: 0, perimeter: 0 }
  )
}

export function formatMeters(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}
