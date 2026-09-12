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
/** Стабильное поле в метрах: чуть больше комнаты, чтобы цифры не липли к краю. */
export const PLANNER_WORKSPACE = { x: 0, y: 0, w: 14, h: 14 }

/** Стена только горизонталь или вертикаль — иначе на телефоне контур неуправляем. */
export function snapToAxis(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return { x: to.x, y: from.y }
  return { x: from.x, y: to.y }
}

export function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Живая подпись стены: см до 1 м, иначе метры. */
export function formatWallLength(meters: number, live = false): string {
  if (!Number.isFinite(meters) || meters < 0.005) return live ? '0 см' : ''
  if (meters < 1) return `${Math.round(meters * 100)} см`
  const digits = live ? 2 : 1
  return `${meters.toFixed(digits).replace('.', ',')} м`
}

export function wallLengths(points: Point[], closed: boolean): number[] {
  if (points.length < 2) return []
  const count = closed ? points.length : points.length - 1
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(segmentLength(points[i], points[(i + 1) % points.length]))
  }
  return out
}

/** Растягивает ортогональную стену, двигая все вершины с «той» стороны. */
export function stretchOrthogonalSegment(points: Point[], index: number, length: number): Point[] {
  if (points.length < 2) return points
  const n = points.length
  const a = points[index]
  const b = points[(index + 1) % n]
  const L = Math.max(0.3, length)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  const dir = horizontal ? (Math.sign(dx) || 1) : (Math.sign(dy) || 1)
  const newB = horizontal ? { x: a.x + dir * L, y: a.y } : { x: a.x, y: a.y + dir * L }
  const ddx = newB.x - b.x
  const ddy = newB.y - b.y
  return points.map((p) => {
    if (horizontal) {
      const onBSide = dir >= 0 ? p.x > a.x + 1e-6 : p.x < a.x - 1e-6
      return onBSide ? { x: p.x + ddx, y: p.y } : { ...p }
    }
    const onBSide = dir >= 0 ? p.y > a.y + 1e-6 : p.y < a.y - 1e-6
    return onBSide ? { x: p.x, y: p.y + ddy } : { ...p }
  })
}

/** Перетаскивание угла: новые стены остаются ортогональными. */
export function dragOrthogonalVertex(points: Point[], index: number, raw: Point, closed: boolean): Point[] {
  if (points.length === 0) return points
  const n = points.length
  const next = points.map((p) => ({ ...p }))
  const prev = next[(index - 1 + n) % n]
  next[index] = snapToAxis(prev, raw)
  if (closed && n >= 3) {
    const i = index
    const nxtI = (i + 1) % n
    const nxt = next[nxtI]
    const cur = next[i]
    if (Math.abs(nxt.x - cur.x) >= Math.abs(nxt.y - cur.y)) {
      next[nxtI] = { x: nxt.x, y: cur.y }
    } else {
      next[nxtI] = { x: cur.x, y: nxt.y }
    }
  }
  return next
}

/** Ось-выровненный прямоугольник: длина по X, ширина по Y, с отступом. */
export function rectanglePoints(length: number, width: number, origin: Point = { x: 1.5, y: 1.5 }): Point[] {
  const l = Math.max(0.3, length)
  const w = Math.max(0.3, width)
  const { x, y } = origin
  return [
    { x, y },
    { x: x + l, y },
    { x: x + l, y: y + w },
    { x, y: y + w },
  ]
}

export function boundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (points.length === 0) return null
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

/** viewBox под контур, чтобы комната 3×4 не терялась в пустом поле 10×10. */
export function viewBoxFromPoints(points: Point[], padding = 0.7): { x: number; y: number; w: number; h: number } {
  const box = boundingBox(points)
  if (!box) return { x: 0, y: 0, w: 8, h: 8 }
  const w = Math.max(1.2, box.maxX - box.minX)
  const h = Math.max(1.2, box.maxY - box.minY)
  const pad = Math.max(padding, Math.max(w, h) * 0.12)
  return {
    x: box.minX - pad,
    y: box.minY - pad,
    w: w + pad * 2,
    h: h + pad * 2,
  }
}

/** Квадратный кадр: комната крупная, вокруг запас под цифры. */
export function squareViewBoxFromPoints(
  points: Point[],
  minSide = 5,
  padding = 1.8
): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { ...PLANNER_WORKSPACE }
  const box = boundingBox(points)
  if (!box) return { ...PLANNER_WORKSPACE }
  const w = box.maxX - box.minX
  const h = box.maxY - box.minY
  const size = Math.max(w, h, minSide)
  const pad = Math.max(padding, size * 0.22)
  const side = size + pad * 2
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  return { x: cx - side / 2, y: cy - side / 2, w: side, h: side }
}

/** Подпись длины снаружи стены, не на линии. */
export function wallLabelAnchor(start: Point, end: Point, centroid: Point | null, offset: number): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy) || 1
  let nx = -dy / len
  let ny = dx / len
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  if (centroid) {
    const inwardX = centroid.x - mid.x
    const inwardY = centroid.y - mid.y
    if (nx * inwardX + ny * inwardY > 0) {
      nx = -nx
      ny = -ny
    }
  }
  return { x: mid.x + nx * offset, y: mid.y + ny * offset }
}

/** Раздвигает подписи, чтобы они не наезжали друг на друга. */
export function separatePoints(points: Point[], minDist: number): Point[] {
  const out = points.map((p) => ({ ...p }))
  for (let iter = 0; iter < 8; iter += 1) {
    for (let i = 0; i < out.length; i += 1) {
      for (let j = i + 1; j < out.length; j += 1) {
        const dx = out[j].x - out[i].x
        const dy = out[j].y - out[i].y
        const d = Math.hypot(dx, dy)
        if (d < 1e-6) {
          out[j].x += minDist * 0.5
          continue
        }
        if (d >= minDist) continue
        const push = (minDist - d) / 2
        const ux = dx / d
        const uy = dy / d
        out[i].x -= ux * push
        out[i].y -= uy * push
        out[j].x += ux * push
        out[j].y += uy * push
      }
    }
  }
  return out
}

/** Тянет стену вдоль её текущего направления — для свободного контура. */
export function stretchWall(points: Point[], index: number, length: number): Point[] {
  if (points.length < 2) return points
  const a = points[index]
  const b = points[(index + 1) % points.length]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const nearlyAxis = Math.abs(dx) < 0.08 || Math.abs(dy) < 0.08
  if (nearlyAxis) return stretchOrthogonalSegment(points, index, length)
  const cur = Math.hypot(dx, dy)
  if (cur < 1e-6) return points
  const L = Math.max(0.3, length)
  const s = L / cur
  const next = points.map((p) => ({ ...p }))
  next[(index + 1) % points.length] = { x: a.x + dx * s, y: a.y + dy * s }
  return next
}

export function pointOnSegment(a: Point, b: Point, t: number): Point {
  const tt = Math.max(0, Math.min(1, t))
  return { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt }
}

export function polygonCentroid(points: Point[]): Point | null {
  if (points.length < 3) return null
  let cx = 0
  let cy = 0
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const cross = a.x * b.y - b.x * a.y
    area += cross
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
  }
  if (area === 0) return null
  const factor = 1 / (3 * area)
  return { x: cx * factor, y: cy * factor }
}
