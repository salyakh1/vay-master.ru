import type { MaterialOption, ObjectTypeId, SurfaceId } from './planner-ui-data'

export type CalcLine = {
  id: string
  surface: SurfaceId
  label: string
  quantity: number
  unit: string
  materialPrice: number
  workPrice: number
  materialTotal: number
  workTotal: number
  note?: string
}

export type BrickSize = { l: number; h: number; w: number; joint: number }

export function bricksPerSqm(size: BrickSize): number {
  const faceL = (size.l + size.joint) / 1000
  const faceH = (size.h + size.joint) / 1000
  if (faceL <= 0 || faceH <= 0) return 0
  return 1 / (faceL * faceH)
}

export function calcQuantity(
  mat: MaterialOption,
  area: number,
  perimeter: number,
  wallHeight: number,
  floorThickCm: number,
  wallThickCm: number,
  brickSize?: BrickSize,
  wastePercent = 10
): { quantity: number; unit: string; note?: string } {
  const waste = 1 + wastePercent / 100

  if (mat.unit === 'm2') {
    return { quantity: +(area * waste).toFixed(1), unit: 'м²' }
  }

  if (mat.unit === 'm3') {
    const thickM = mat.surface === 'floor' ? floorThickCm / 100 : wallThickCm / 100
    return { quantity: +((area * thickM) * waste).toFixed(3), unit: 'м³' }
  }

  if (mat.unit === 'pcs' && mat.countMode === 'brick' && brickSize) {
    const perSqm = bricksPerSqm(brickSize)
    const count = Math.ceil(area * perSqm * waste)
    return {
      quantity: count,
      unit: 'шт',
      note: `≈ ${Math.round(perSqm)} шт/м² · ${brickSize.l}×${brickSize.h}×${brickSize.w} мм`,
    }
  }

  if (mat.unit === 'pcs' && mat.countMode === 'block' && brickSize) {
    const blockFace = ((brickSize.l + brickSize.joint) / 1000) * ((brickSize.h + brickSize.joint) / 1000)
    const count = blockFace > 0 ? Math.ceil((area / blockFace) * waste) : 0
    return {
      quantity: count,
      unit: 'шт',
      note: `блок ${brickSize.l}×${brickSize.h}×${brickSize.w} мм`,
    }
  }

  if (mat.unit === 'pcs') {
    return { quantity: Math.ceil(area * waste), unit: 'шт' }
  }

  if (mat.unit === 'lm') {
    return { quantity: +(perimeter * waste).toFixed(1), unit: 'п.м' }
  }

  return { quantity: +(area * waste).toFixed(1), unit: 'м²' }
}

export function buildCalcLines(input: {
  objectType: ObjectTypeId
  enabledSurfaces: Record<SurfaceId, boolean>
  selections: Partial<Record<SurfaceId, string>>
  matsBySurface: Record<SurfaceId, MaterialOption[]>
  areas: { floor: number; walls: number; ceiling: number; perimeter: number }
  wallHeight: number
  floorThick: number
  wallThick: number
  brickSize: BrickSize
  wastePercent: number
  surfacePrices: Partial<Record<SurfaceId, { material: number; work: number }>>
}): CalcLine[] {
  const lines: CalcLine[] = []
  const { areas, enabledSurfaces, selections, matsBySurface } = input

  const areaForSurface = (s: SurfaceId): number => {
    if (s === 'floor' || s === 'paving') return areas.floor
    if (s === 'walls' || s === 'facade') return areas.walls
    if (s === 'ceiling') return areas.ceiling
    if (s === 'roof') return areas.floor
    return 0
  }

  ;(['floor', 'walls', 'ceiling', 'roof', 'facade', 'paving'] as SurfaceId[]).forEach((surface) => {
    if (!enabledSurfaces[surface]) return
    const matId = selections[surface]
    if (!matId) return
    const mat = matsBySurface[surface]?.find((m) => m.id === matId)
    if (!mat) return

    const area = areaForSurface(surface)
    if (area <= 0) return

    const { quantity, unit, note } = calcQuantity(
      mat,
      area,
      areas.perimeter,
      input.wallHeight,
      input.floorThick,
      input.wallThick,
      input.brickSize,
      input.wastePercent
    )

    const prices = input.surfacePrices[surface]
    const materialPrice = Math.max(0, prices?.material ?? 0)
    const workPrice = Math.max(0, prices?.work ?? 0)

    lines.push({
      id: `${surface}-${mat.id}`,
      surface,
      label: `${mat.icon} ${mat.name}`,
      quantity,
      unit,
      materialPrice,
      workPrice,
      materialTotal: Math.round(quantity * materialPrice),
      workTotal: Math.round(quantity * workPrice),
      note,
    })
  })

  return lines
}
