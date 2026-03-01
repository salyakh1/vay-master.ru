/**
 * Room Planner: геометрия полигонов, пересечения, снап к углам и сетке.
 * Координаты в метрах (как на холсте).
 */

export type Point = { x: number; y: number }

const GRID_10_CM = 0.1

/** Площадь произвольного многоугольника (Shoelace). Работает для вогнутых и сложных форм. */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** Периметр: сумма длин сегментов. */
export function polygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return total
}

/** Пересекаются ли отрезки (a1,a2) и (b1,b2) в внутренней точке (не в концах). */
function segmentsIntersect(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): boolean {
  const dax = a2.x - a1.x
  const day = a2.y - a1.y
  const dbx = b2.x - b1.x
  const dby = b2.y - b1.y
  const den = dax * dby - day * dbx
  if (Math.abs(den) < 1e-10) return false // параллельны
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / den
  const s = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / den
  const eps = 1e-6
  return t > eps && t < 1 - eps && s > eps && s < 1 - eps
}

/** Проверка самопересечения при замыкании: сегмент (last -> first) не должен пересекать другие сегменты. */
export function wouldCloseIntersect(points: Point[]): boolean {
  if (points.length < 3) return false
  const first = points[0]
  const last = points[points.length - 1]
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (segmentsIntersect(last, first, a, b)) return true
  }
  return false
}

/** Снап к сетке 10 см. */
export function snapToGrid(p: Point, gridStep: number = GRID_10_CM): Point {
  const step = Math.max(0.01, gridStep)
  return {
    x: Math.round(p.x / step) * step,
    y: Math.round(p.y / step) * step,
  }
}

/** Угол в градусах к горизонтали (0° = вправо, 90° = вверх). */
function angleDeg(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

/** Снап угла к 0, 90, 45, -45, -90, 180 (опционально 45). */
export function snapToAngle(
  from: Point,
  to: Point,
  length: number,
  include45: boolean = true
): Point {
  if (length < 1e-6) return { ...to }
  const deg = angleDeg(from, to)
  const angles = [0, 90, -90, 180]
  if (include45) angles.push(45, -45, 135, -135)
  let best = angles[0]
  let bestDiff = Math.abs(normalizeAngle(deg - best))
  for (const a of angles) {
    const d = Math.abs(normalizeAngle(deg - a))
    if (d < bestDiff) {
      bestDiff = d
      best = a
    }
  }
  const rad = (best * Math.PI) / 180
  return {
    x: from.x + length * Math.cos(rad),
    y: from.y + length * Math.sin(rad),
  }
}

function normalizeAngle(deg: number): number {
  let d = deg % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

/** Точка на сегменте (index, index+1) ближайшая к p; t in [0,1]. Возвращает null если не на сегменте. */
export function closestPointOnSegment(
  p: Point,
  segStart: Point,
  segEnd: Point
): { point: Point; t: number } | null {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-12) return { point: { ...segStart }, t: 0 }
  let t = ((p.x - segStart.x) * dx + (p.y - segStart.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return {
    point: { x: segStart.x + t * dx, y: segStart.y + t * dy },
    t,
  }
}

/** Индекс сегмента, ближайший к точке p (в пределах порога по расстоянию). */
export function segmentIndexNearPoint(
  points: Point[],
  p: Point,
  threshold: number
): number | null {
  if (points.length < 2) return null
  let bestIdx: number | null = null
  let bestDist = threshold
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const proj = closestPointOnSegment(p, a, b)
    if (!proj) continue
    const d = Math.hypot(p.x - proj.point.x, p.y - proj.point.y)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

export const PLANNER_GRID_STEP = GRID_10_CM
export const MIN_AREA_M2 = 2
