export type ObjectTypeId = 'room' | 'apartment' | 'house' | 'yard'
export type SurfaceId = 'floor' | 'walls' | 'ceiling' | 'roof' | 'facade' | 'paving'

export type MaterialOption = {
  id: string
  icon: string
  name: string
  sub: string
  keywords: string[]
  surface: SurfaceId
  unit: 'm2' | 'm3' | 'pcs' | 'lm'
  materialPrice: number
  workPrice: number
  countMode?: 'brick' | 'block'
}

export const OBJECT_TYPES: { id: ObjectTypeId; icon: string; name: string }[] = [
  { id: 'room', icon: '🚪', name: 'Комната' },
  { id: 'apartment', icon: '🏢', name: 'Квартира' },
  { id: 'house', icon: '🏡', name: 'Дом' },
  { id: 'yard', icon: '🌳', name: 'Двор' },
]

export const SURFACE_LABELS: Record<SurfaceId, string> = {
  floor: 'Пол',
  walls: 'Стены',
  ceiling: 'Потолок',
  roof: 'Крыша',
  facade: 'Фасад',
  paving: 'Покрытие',
}

export const SURFACES_BY_OBJECT: Record<ObjectTypeId, SurfaceId[]> = {
  room: ['floor', 'walls', 'ceiling'],
  apartment: ['floor', 'walls', 'ceiling'],
  house: ['floor', 'walls', 'ceiling', 'roof', 'facade'],
  yard: ['paving'],
}

export const FLOOR_MATS: MaterialOption[] = [
  { id: 'laminate', icon: '🟤', name: 'Ламинат', sub: 'от 850 ₽/м²', keywords: ['ламинат'], surface: 'floor', unit: 'm2', materialPrice: 850, workPrice: 450 },
  { id: 'tile', icon: '🟫', name: 'Плитка', sub: 'от 1200 ₽/м²', keywords: ['плитк'], surface: 'floor', unit: 'm2', materialPrice: 1200, workPrice: 900 },
  { id: 'screed', icon: '⬜', name: 'Стяжка', sub: 'от 3200 ₽/м³', keywords: ['стяжк', 'наливн'], surface: 'floor', unit: 'm3', materialPrice: 3200, workPrice: 1800 },
  { id: 'concrete', icon: '🪨', name: 'Бетон', sub: 'от 4500 ₽/м³', keywords: ['бетон'], surface: 'floor', unit: 'm3', materialPrice: 4500, workPrice: 2200 },
  { id: 'parquet', icon: '🪵', name: 'Паркет', sub: 'от 2800 ₽/м²', keywords: ['паркет'], surface: 'floor', unit: 'm2', materialPrice: 2800, workPrice: 1200 },
  { id: 'linoleum', icon: '🟥', name: 'Линолеум', sub: 'от 650 ₽/м²', keywords: ['линолеум'], surface: 'floor', unit: 'm2', materialPrice: 650, workPrice: 350 },
]

export const WALL_MATS: MaterialOption[] = [
  { id: 'paint', icon: '🖌️', name: 'Краска', sub: 'от 180 ₽/м²', keywords: ['краск', 'окрас'], surface: 'walls', unit: 'm2', materialPrice: 180, workPrice: 250 },
  { id: 'wallpaper', icon: '🗞️', name: 'Обои', sub: 'от 450 ₽/м²', keywords: ['обои'], surface: 'walls', unit: 'm2', materialPrice: 450, workPrice: 350 },
  { id: 'wall-tile', icon: '🟦', name: 'Плитка', sub: 'от 1100 ₽/м²', keywords: ['плитк'], surface: 'walls', unit: 'm2', materialPrice: 1100, workPrice: 950 },
  { id: 'plaster', icon: '⬜', name: 'Штукатурка', sub: 'от 2800 ₽/м³', keywords: ['штукатур', 'шпакл'], surface: 'walls', unit: 'm3', materialPrice: 2800, workPrice: 1600 },
  { id: 'panel', icon: '🟫', name: 'Панели', sub: 'от 900 ₽/м²', keywords: ['панел'], surface: 'walls', unit: 'm2', materialPrice: 900, workPrice: 550 },
]

export const CEIL_MATS: MaterialOption[] = [
  { id: 'ceil-paint', icon: '🖌️', name: 'Краска', sub: 'от 160 ₽/м²', keywords: ['краск', 'потолок'], surface: 'ceiling', unit: 'm2', materialPrice: 160, workPrice: 220 },
  { id: 'stretch', icon: '🎨', name: 'Натяжной', sub: 'от 650 ₽/м²', keywords: ['натяж'], surface: 'ceiling', unit: 'm2', materialPrice: 650, workPrice: 450 },
  { id: 'gypsum', icon: '🔲', name: 'Гипсокартон', sub: 'от 480 ₽/м²', keywords: ['гипс', 'гкл'], surface: 'ceiling', unit: 'm2', materialPrice: 480, workPrice: 550 },
]

export const ROOF_MATS: MaterialOption[] = [
  { id: 'metal-tile', icon: '🏠', name: 'Металлочерепица', sub: 'от 580 ₽/м²', keywords: ['металл'], surface: 'roof', unit: 'm2', materialPrice: 580, workPrice: 420 },
  { id: 'soft-roof', icon: '🟫', name: 'Мягкая кровля', sub: 'от 720 ₽/м²', keywords: ['кровл'], surface: 'roof', unit: 'm2', materialPrice: 720, workPrice: 480 },
  { id: 'slate', icon: '⬛', name: 'Шифер', sub: 'от 320 ₽/м²', keywords: ['шифер'], surface: 'roof', unit: 'm2', materialPrice: 320, workPrice: 350 },
]

export const FACADE_MATS: MaterialOption[] = [
  { id: 'brick', icon: '🧱', name: 'Кирпич', sub: 'по размеру', keywords: ['кирпич'], surface: 'facade', unit: 'pcs', materialPrice: 18, workPrice: 45, countMode: 'brick' },
  { id: 'block', icon: '🧊', name: 'Газоблок', sub: 'по размеру', keywords: ['блок', 'газоб'], surface: 'facade', unit: 'pcs', materialPrice: 95, workPrice: 120, countMode: 'block' },
  { id: 'clinker', icon: '🟥', name: 'Клинкер', sub: 'по размеру', keywords: ['клинкер'], surface: 'facade', unit: 'pcs', materialPrice: 42, workPrice: 65, countMode: 'brick' },
  { id: 'siding', icon: '📐', name: 'Сайдинг', sub: 'от 420 ₽/м²', keywords: ['сайдинг'], surface: 'facade', unit: 'm2', materialPrice: 420, workPrice: 380 },
  { id: 'plaster-facade', icon: '🖌️', name: 'Штукатурка', sub: 'от 380 ₽/м²', keywords: ['штукатур'], surface: 'facade', unit: 'm2', materialPrice: 380, workPrice: 450 },
]

export const PAVING_MATS: MaterialOption[] = [
  { id: 'pavers', icon: '🟫', name: 'Брусчатка', sub: 'от 980 ₽/м²', keywords: ['брусчат'], surface: 'paving', unit: 'm2', materialPrice: 980, workPrice: 650 },
  { id: 'tile-yard', icon: '⬜', name: 'Трот. плитка', sub: 'от 720 ₽/м²', keywords: ['плитк'], surface: 'paving', unit: 'm2', materialPrice: 720, workPrice: 520 },
  { id: 'asphalt', icon: '⬛', name: 'Асфальт', sub: 'от 850 ₽/м²', keywords: ['асфальт'], surface: 'paving', unit: 'm2', materialPrice: 850, workPrice: 480 },
  { id: 'gravel', icon: '🪨', name: 'Щебень', sub: 'от 320 ₽/м²', keywords: ['щебень'], surface: 'paving', unit: 'm2', materialPrice: 320, workPrice: 280 },
]

export const MATS_BY_SURFACE: Record<SurfaceId, MaterialOption[]> = {
  floor: FLOOR_MATS,
  walls: WALL_MATS,
  ceiling: CEIL_MATS,
  roof: ROOF_MATS,
  facade: FACADE_MATS,
  paving: PAVING_MATS,
}

export const BRICK_PRESETS: Record<string, { l: number; h: number; w: number }> = {
  brick: { l: 250, h: 65, w: 120 },
  clinker: { l: 250, h: 65, w: 120 },
  block: { l: 600, h: 200, w: 300 },
}

export const DEFAULT_BRICK_SIZE = { l: 250, h: 65, w: 120, joint: 10 }

export function findMat(mats: MaterialOption[], id: string): MaterialOption | undefined {
  return mats.find((m) => m.id === id)
}

export function findMatById(id: string): MaterialOption | undefined {
  for (const list of Object.values(MATS_BY_SURFACE)) {
    const hit = list.find((m) => m.id === id)
    if (hit) return hit
  }
  return undefined
}

export function defaultEnabledSurfaces(objectType: ObjectTypeId): Record<SurfaceId, boolean> {
  const list = SURFACES_BY_OBJECT[objectType]
  return {
    floor: list.includes('floor'),
    walls: list.includes('walls'),
    ceiling: list.includes('ceiling'),
    roof: list.includes('roof'),
    facade: list.includes('facade'),
    paving: list.includes('paving'),
  }
}

export type SurfacePriceEntry = { material: number; work: number }
export type SurfacePrices = Partial<Record<SurfaceId, SurfacePriceEntry>>

export function unitLabel(unit: MaterialOption['unit']): string {
  const map = { m2: 'м²', m3: 'м³', pcs: 'шт', lm: 'п.м' } as const
  return map[unit]
}

export function pricesFromSelections(
  selections: Partial<Record<SurfaceId, string>>
): SurfacePrices {
  const out: SurfacePrices = {}
  for (const surface of Object.keys(selections) as SurfaceId[]) {
    const matId = selections[surface]
    if (!matId) continue
    const mat = findMatById(matId)
    if (mat) out[surface] = { material: mat.materialPrice, work: mat.workPrice }
  }
  return out
}

export function defaultSelections(objectType: ObjectTypeId): Partial<Record<SurfaceId, string>> {
  if (objectType === 'yard') return { paving: 'pavers' }
  if (objectType === 'house') {
    return {
      floor: 'laminate',
      walls: 'paint',
      ceiling: 'ceil-paint',
      roof: 'metal-tile',
      facade: 'brick',
    }
  }
  return { floor: 'laminate', walls: 'paint', ceiling: 'ceil-paint' }
}

// Legacy exports for compatibility
export type MatOption = MaterialOption
export const PLANNER_CHECKLIST: { id: string; group: string; name: string; sub: string }[] = []
export function findMatLabel(mats: MaterialOption[], id: string) {
  return findMat(mats, id)
}
