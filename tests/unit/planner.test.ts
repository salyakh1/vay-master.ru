import { describe, expect, it } from 'vitest'
import { buildCalcLines } from '@/components/planner/planner-calculations'
import { buildEstimateShareText, buildOrderDraft } from '@/components/planner/planner-estimate'
import { MATS_BY_SURFACE, defaultEnabledSurfaces, defaultSelections, pricesFromSelections } from '@/components/planner/planner-ui-data'
import { defaultRoom, parseMeters, roomArea, roomsTotals } from '@/components/planner/planner-rooms'
import {
  formatWallLength,
  polygonArea,
  rectanglePoints,
  squareViewBoxFromPoints,
  stretchOrthogonalSegment,
  wallLabelAnchor,
  separatePoints,
  wallLengths,
} from '@/lib/planner-geometry'
import { MIN_ORDER_DESCRIPTION_LENGTH } from '@/lib/order-validation'

describe('planner rooms and geometry', () => {
  it('parses meters with comma', () => {
    expect(parseMeters('3,5')).toBe(3.5)
    expect(parseMeters(' 4 ')).toBe(4)
    expect(parseMeters('0')).toBe(0)
  })

  it('sums apartment rooms', () => {
    const rooms = [
      { ...defaultRoom('А'), length: 4, width: 3 },
      { ...defaultRoom('Б'), length: 2, width: 2 },
    ]
    const t = roomsTotals(rooms)
    expect(t.area).toBe(16)
    expect(t.perimeter).toBe(2 * (7 + 4))
    expect(roomArea(rooms[0])).toBe(12)
  })

  it('rectangle area matches length × width', () => {
    const pts = rectanglePoints(4, 3)
    expect(polygonArea(pts)).toBeCloseTo(12, 5)
  })

  it('square viewBox keeps the room centered without letterbox', () => {
    const pts = rectanglePoints(4, 3)
    const vb = squareViewBoxFromPoints(pts, 5, 1.8)
    expect(vb.w).toBeCloseTo(vb.h, 5)
    expect(vb.w).toBeGreaterThanOrEqual(8)
    expect(vb.x).toBeLessThan(pts[0].x)
    expect(vb.x + vb.w).toBeGreaterThan(pts[1].x)
  })

  it('places wall numbers outside the wall and apart from each other', () => {
    const pts = rectanglePoints(4, 3)
    const centroid = { x: 3.5, y: 3 }
    const top = wallLabelAnchor(pts[0], pts[1], centroid, 0.5)
    expect(top.y).toBeLessThan((pts[0].y + pts[1].y) / 2)
    const raw = [
      wallLabelAnchor(pts[0], pts[1], centroid, 0.4),
      wallLabelAnchor(pts[1], pts[2], centroid, 0.4),
      wallLabelAnchor(pts[2], pts[3], centroid, 0.4),
      wallLabelAnchor(pts[3], pts[0], centroid, 0.4),
    ]
    const sep = separatePoints(raw, 1.2)
    for (let i = 0; i < sep.length; i += 1) {
      for (let j = i + 1; j < sep.length; j += 1) {
        expect(Math.hypot(sep[j].x - sep[i].x, sep[j].y - sep[i].y)).toBeGreaterThanOrEqual(1.19)
      }
    }
  })

  it('formats live wall length in cm under 1 m and meters above', () => {
    expect(formatWallLength(0.37, true)).toBe('37 см')
    expect(formatWallLength(2.35, true)).toBe('2,35 м')
    expect(formatWallLength(4, false)).toBe('4,0 м')
  })

  it('stretches an orthogonal wall by numbers without tilting others', () => {
    const pts = rectanglePoints(4, 3)
    const next = stretchOrthogonalSegment(pts, 0, 6)
    expect(wallLengths(next, true)[0]).toBeCloseTo(6, 5)
    expect(polygonArea(next)).toBeCloseTo(18, 5)
    const verts = next.map((p) => `${p.x},${p.y}`)
    expect(new Set(verts).size).toBe(4)
  })
})

describe('planner estimate → order', () => {
  const lines = buildCalcLines({
    objectType: 'room',
    enabledSurfaces: defaultEnabledSurfaces('room'),
    selections: defaultSelections('room'),
    matsBySurface: MATS_BY_SURFACE,
    areas: { floor: 12, walls: 30, ceiling: 12, perimeter: 14 },
    wallHeight: 2.7,
    floorThick: 5,
    wallThick: 1.5,
    brickSize: { l: 250, h: 65, w: 120, joint: 10 },
    wastePercent: 10,
    surfacePrices: pricesFromSelections(defaultSelections('room')),
  })

  it('builds calc lines for enabled surfaces with area', () => {
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((l) => l.quantity > 0)).toBe(true)
  })

  it('order description is long enough for paid order validation', () => {
    const share = buildEstimateShareText({
      objectType: 'room',
      floorArea: 12,
      wallArea: 30,
      ceilingArea: 12,
      perimeter: 14,
      wallHeight: 2.7,
      calcLines: lines,
      materialTotal: lines.reduce((s, l) => s + l.materialTotal, 0),
      workTotal: lines.reduce((s, l) => s + l.workTotal, 0),
      grandTotal: 100000,
    })
    const draft = buildOrderDraft({
      objectType: 'room',
      floorArea: 12,
      wallHeight: 2.7,
      calcLines: lines,
      grandTotal: 100000,
      shareText: share,
    })
    expect(draft.title.length).toBeGreaterThanOrEqual(5)
    expect(draft.description.length).toBeGreaterThanOrEqual(MIN_ORDER_DESCRIPTION_LENGTH)
    expect(draft.budget).toBe(100000)
  })
})
