'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import PlannerSinglePage from '@/components/planner/PlannerSinglePage'
import PlannerCanvas from '@/components/planner/PlannerCanvas'
import Navbar from '@/components/Navbar'
import { buildCalcLines, type BrickSize } from '@/components/planner/planner-calculations'
import {
  MATS_BY_SURFACE,
  SURFACES_BY_OBJECT,
  defaultEnabledSurfaces,
  defaultSelections,
  pricesFromSelections,
  DEFAULT_BRICK_SIZE,
  BRICK_PRESETS,
  findMatById,
  type ObjectTypeId,
  type SurfaceId,
  type SurfacePrices,
} from '@/components/planner/planner-ui-data'
import type { PlannerInputMode, PlannerOpening, PlannerStep, RecommendedMaster, RecommendedProduct } from '@/components/planner/planner-types'
import {
  polygonArea,
  polygonPerimeter,
  wouldCloseIntersect,
  snapToGrid,
  segmentIndexNearPoint,
  closestPointOnSegment,
  PLANNER_GRID_STEP,
  rectanglePoints,
  stretchWall,
  wallLengths,
  squareViewBoxFromPoints,
  type Point,
} from '@/lib/planner-geometry'
import {
  clampMeters,
  defaultRoom,
  newRoomId,
  roomsTotals,
  type PlannerRoom,
} from '@/components/planner/planner-rooms'
import {
  PLANNER_DRAFT_STORAGE_KEY,
  PLANNER_ORDER_STORAGE_KEY,
  buildEstimateShareText,
  buildOrderDraft,
} from '@/components/planner/planner-estimate'
import { loginUrl } from '@/lib/guest-access'

const DEFAULT_OPENING = {
  door: { width: 0.9, height: 2.1 },
  window: { width: 1.2, height: 1.4 },
} as const

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<PlannerStep>(0)
  const [inputMode, setInputMode] = useState<PlannerInputMode>('size')
  const [objectType, setObjectType] = useState<ObjectTypeId>('room')
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('floor')
  const [enabledSurfaces, setEnabledSurfaces] = useState(defaultEnabledSurfaces('room'))
  const [selections, setSelections] = useState<Partial<Record<SurfaceId, string>>>(defaultSelections('room'))
  const [surfacePrices, setSurfacePrices] = useState<SurfacePrices>(() =>
    pricesFromSelections(defaultSelections('room'))
  )
  const [brickSize, setBrickSize] = useState<BrickSize>(DEFAULT_BRICK_SIZE)
  const [savedHint, setSavedHint] = useState(false)
  const [shareHint, setShareHint] = useState<string | null>(null)
  const [floorThick, setFloorThick] = useState(5)
  const [wallThick, setWallThick] = useState(1.5)
  const [drawTool, setDrawTool] = useState<'draw' | 'door' | 'window'>('draw')
  const [wallHeight, setWallHeight] = useState(2.7)
  const [roomLength, setRoomLength] = useState(4)
  const [roomWidth, setRoomWidth] = useState(3)
  const [rooms, setRooms] = useState<PlannerRoom[]>([defaultRoom()])
  const [openings, setOpenings] = useState<PlannerOpening[]>([])

  const [recommendedMasters, setRecommendedMasters] = useState<RecommendedMaster[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)

  const [gridStep] = useState(PLANNER_GRID_STEP)
  const [snapToGridEnabled] = useState(true)
  const [points, setPoints] = useState<Point[]>(() => rectanglePoints(4, 3))
  const [isClosed, setIsClosed] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)
  const [reservePercent, setReservePercent] = useState(10)
  const [closeBlockedReason, setCloseBlockedReason] = useState<string | null>(null)
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null)
  const [history, setHistory] = useState<{ points: Point[]; isClosed: boolean; openings: PlannerOpening[] }[]>([])
  const [redoStack, setRedoStack] = useState<{ points: Point[]; isClosed: boolean; openings: PlannerOpening[] }[]>([])
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDistanceRef = useRef<number | null>(null)
  const isPinchingRef = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const touchPinchRef = useRef<number | null>(null)
  const zoomRef = useRef(1)
  const skipSizeSyncRef = useRef(false)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  const fittedViewBox = useMemo(() => {
    const z = Math.min(2.4, Math.max(0.8, zoom))
    const base = squareViewBoxFromPoints(points)
    return {
      x: base.x + (base.w * (1 - 1 / z)) / 2,
      y: base.y + (base.h * (1 - 1 / z)) / 2,
      w: base.w / z,
      h: base.h / z,
    }
  }, [zoom, points])

  const viewBoxFrozenRef = useRef(fittedViewBox)
  const viewBoxLocked = isDrawing || draggingPointIndex !== null
  if (!viewBoxLocked) viewBoxFrozenRef.current = fittedViewBox
  const viewBox = viewBoxLocked ? viewBoxFrozenRef.current : fittedViewBox

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault()
        const dx = event.touches[0].clientX - event.touches[1].clientX
        const dy = event.touches[0].clientY - event.touches[1].clientY
        touchPinchRef.current = Math.hypot(dx, dy)
        isPinchingRef.current = true
      }
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && touchPinchRef.current) {
        event.preventDefault()
        const dx = event.touches[0].clientX - event.touches[1].clientX
        const dy = event.touches[0].clientY - event.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        setZoom(Math.min(3, Math.max(0.6, zoomRef.current * (dist / touchPinchRef.current))))
        touchPinchRef.current = dist
      }
    }
    const onTouchEnd = () => {
      touchPinchRef.current = null
      isPinchingRef.current = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [inputMode, step])

  const selectedKeywords = useMemo(() => {
    const keys: string[] = []
    for (const surface of SURFACES_BY_OBJECT[objectType]) {
      if (!enabledSurfaces[surface]) continue
      const mat = findMatById(selections[surface] || '')
      if (mat) keys.push(...mat.keywords)
    }
    return Array.from(new Set(keys)).slice(0, 8)
  }, [objectType, enabledSurfaces, selections])

  useEffect(() => {
    let cancelled = false
    setRecommendationsLoading(true)
    const timer = window.setTimeout(() => {
      if (!cancelled) setRecommendationsLoading(false)
    }, 9000)

    const mastersUrl = '/api/search/masters?page=1&limit=12'

    Promise.all([
      fetch(mastersUrl)
        .then((r) => (r.ok ? r.json() : { masters: [] }))
        .catch(() => ({ masters: [] })),
      Promise.resolve(
        supabase
          .from('products')
          .select('id, name, price, images')
          .eq('in_stock', true)
          .order('created_at', { ascending: false })
          .limit(24)
          .then(({ data, error }) => (error ? [] : data || []))
      ).catch(() => [] as RecommendedProduct[]),
    ])
      .then(([mastersRes, products]) => {
        if (cancelled) return
        const masters = ((mastersRes as { masters?: RecommendedMaster[] }).masters || []).slice(0, 12)
        setRecommendedMasters(masters)
        let list = (products as RecommendedProduct[]) || []
        if (selectedKeywords.length > 0) {
          const filtered = list.filter((p) =>
            selectedKeywords.some((kw) => (p.name || '').toLowerCase().includes(kw.toLowerCase()))
          )
          if (filtered.length > 0) list = filtered
        }
        setRecommendedProducts(list.slice(0, 12))
      })
      .finally(() => {
        window.clearTimeout(timer)
        if (!cancelled) setRecommendationsLoading(false)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [selectedKeywords])

  useEffect(() => {
    if (inputMode !== 'size' || skipSizeSyncRef.current) return
    if (objectType === 'apartment' && rooms[0]) {
      setPoints(rectanglePoints(rooms[0].length, rooms[0].width))
      setIsClosed(true)
      setOpenings([])
      return
    }
    setPoints(rectanglePoints(roomLength, roomWidth))
    setIsClosed(true)
    setOpenings([])
  }, [inputMode, objectType, roomLength, roomWidth, rooms])

  const polygonClosed = isClosed && points.length >= 3
  const drawnWallLengths = useMemo(() => wallLengths(points, isClosed), [points, isClosed])
  const polygonFloor = polygonClosed ? polygonArea(points) : 0
  const polygonPerim = polygonClosed ? polygonPerimeter(points) : 0

  const sizeTotals = useMemo(() => {
    if (objectType === 'apartment' && inputMode === 'size') return roomsTotals(rooms)
    if (inputMode === 'size') {
      return {
        area: roomLength * roomWidth,
        perimeter: 2 * (roomLength + roomWidth),
      }
    }
    return { area: polygonFloor, perimeter: polygonPerim }
  }, [objectType, inputMode, rooms, roomLength, roomWidth, polygonFloor, polygonPerim])

  const floorArea = sizeTotals.area
  const perimeter = sizeTotals.perimeter
  const openingsArea = openings.reduce((sum, o) => sum + Math.max(0, o.width) * Math.max(0, o.height), 0)
  const wallAreaNet = objectType === 'yard' ? 0 : Math.max(0, perimeter * Math.max(0, wallHeight) - openingsArea)
  const ceilingArea = objectType === 'yard' ? 0 : floorArea
  const roofArea = objectType === 'house' ? floorArea * 1.2 : floorArea

  const calcLines = useMemo(
    () =>
      buildCalcLines({
        objectType,
        enabledSurfaces,
        selections,
        matsBySurface: MATS_BY_SURFACE,
        areas: { floor: floorArea, walls: wallAreaNet, ceiling: ceilingArea, perimeter, roof: roofArea },
        wallHeight,
        floorThick,
        wallThick,
        brickSize,
        wastePercent: reservePercent,
        surfacePrices,
      }),
    [
      objectType,
      enabledSurfaces,
      selections,
      floorArea,
      wallAreaNet,
      ceilingArea,
      perimeter,
      roofArea,
      wallHeight,
      floorThick,
      wallThick,
      brickSize,
      reservePercent,
      surfacePrices,
    ]
  )

  const materialTotal = calcLines.reduce((s, l) => s + l.materialTotal, 0)
  const workTotalCalc = calcLines.reduce((s, l) => s + l.workTotal, 0)
  const grandTotalCalc = materialTotal + workTotalCalc

  const snapshot = useCallback(
    () => ({ points: [...points], isClosed, openings: [...openings] }),
    [points, isClosed, openings]
  )

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, snapshot()])
    setRedoStack([])
  }, [snapshot])

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      setRedoStack((r) => [...r, snapshot()])
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      setPoints(prev.points)
      setIsClosed(prev.isClosed)
      setOpenings(prev.openings)
      setCloseBlockedReason(null)
      setDraggingPointIndex(null)
      return
    }
    if (points.length === 0) return
    setPoints((prev) => prev.slice(0, -1))
    setIsClosed(false)
    setCurrentPoint(null)
  }, [history, points.length, snapshot])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((r) => r.slice(0, -1))
    setHistory((h) => [...h, snapshot()])
    setPoints(next.points)
    setIsClosed(next.isClosed)
    setOpenings(next.openings)
  }, [redoStack, snapshot])

  const getPointFromEvent = (
    event: React.PointerEvent<SVGSVGElement>
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.w
    const y = viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.h
    const p: Point = { x, y }
    return snapToGridEnabled ? snapToGrid(p, gridStep) : p
  }

  const updatePointers = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    pointersRef.current.set(event.pointerId, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  const hitRadius = Math.max(0.22, Math.max(viewBox.w, viewBox.h) * 0.04)

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (inputMode !== 'draw') return
    if (event.pointerType === 'touch' && isPinchingRef.current) return
    svgRef.current?.setPointerCapture(event.pointerId)
    updatePointers(event)

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      pinchDistanceRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      isPinchingRef.current = true
      setIsDrawing(false)
      setCurrentPoint(null)
      return
    }

    const p = getPointFromEvent(event)

    if (drawTool === 'door' || drawTool === 'window') {
      if (!polygonClosed) {
        setCloseBlockedReason('Сначала замкните контур, затем ставьте дверь или окно')
        return
      }
      const segIdx = segmentIndexNearPoint(points, p, hitRadius * 1.6)
      if (segIdx === null) {
        setCloseBlockedReason('Нажмите на стену')
        return
      }
      const a = points[segIdx]
      const b = points[(segIdx + 1) % points.length]
      const proj = closestPointOnSegment(p, a, b)
      pushHistory()
      const def = DEFAULT_OPENING[drawTool]
      setOpenings((prev) => [
        ...prev,
        {
          id: `o-${Date.now()}`,
          type: drawTool,
          segmentIndex: segIdx,
          t: proj?.t ?? 0.5,
          width: def.width,
          height: def.height,
        },
      ])
      setCloseBlockedReason(null)
      setDrawTool('draw')
      return
    }

    if (isClosed) {
      for (let i = 0; i < points.length; i++) {
        if (Math.hypot(p.x - points[i].x, p.y - points[i].y) <= hitRadius) {
          setDraggingPointIndex(i)
          return
        }
      }
      const segIdx = segmentIndexNearPoint(points, p, hitRadius)
      if (segIdx !== null) {
        const a = points[segIdx]
        const b = points[(segIdx + 1) % points.length]
        const proj = closestPointOnSegment(p, a, b)
        if (proj) {
          pushHistory()
          setPoints((prev) => {
            const next = [...prev]
            next.splice(segIdx + 1, 0, snapToGrid(proj.point, gridStep))
            return next
          })
        }
      }
      return
    }

    setIsDrawing(true)
    if (points.length === 0) {
      pushHistory()
      setPoints([p])
    }
    setCurrentPoint(p)
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (inputMode !== 'draw' || drawTool !== 'draw') return
    if (event.pointerType === 'touch' && isPinchingRef.current) return
    updatePointers(event)

    if (isPinchingRef.current && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinchDistanceRef.current) {
        setZoom(Math.min(3, Math.max(0.6, zoom * (dist / pinchDistanceRef.current))))
        pinchDistanceRef.current = dist
      }
      return
    }

    if (draggingPointIndex !== null) {
      const raw = getPointFromEvent(event)
      setPoints((prev) => {
        const next = prev.map((p) => ({ ...p }))
        next[draggingPointIndex] = raw
        return next
      })
      return
    }

    if (!isDrawing || isClosed) return
    setCurrentPoint(getPointFromEvent(event))
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (inputMode !== 'draw') return
    pointersRef.current.delete(event.pointerId)
    svgRef.current?.releasePointerCapture(event.pointerId)

    if (isPinchingRef.current && pointersRef.current.size < 2) {
      isPinchingRef.current = false
      pinchDistanceRef.current = null
      return
    }

    if (drawTool !== 'draw') return

    if (draggingPointIndex !== null) {
      setDraggingPointIndex(null)
      return
    }

    if (!isDrawing) return
    let nextPoint = currentPoint || getPointFromEvent(event)
    if (snapToGridEnabled) nextPoint = snapToGrid(nextPoint, gridStep)
    setIsDrawing(false)
    setCurrentPoint(null)

    setPoints((prev) => {
      const minDistance = 0.35
      if (prev.length > 0) {
        const dist = Math.hypot(nextPoint.x - prev[prev.length - 1].x, nextPoint.y - prev[prev.length - 1].y)
        if (dist < minDistance) return prev
      }

      if (prev.length >= 2) {
        const first = prev[0]
        const closeDistance = 0.55
        const distance = Math.hypot(nextPoint.x - first.x, nextPoint.y - first.y)
        if (distance <= closeDistance) {
          if (wouldCloseIntersect([...prev, nextPoint])) {
            setCloseBlockedReason('Контур пересекается — так замкнуть нельзя')
            return prev
          }
          setCloseBlockedReason(null)
          pushHistory()
          setIsClosed(true)
          return prev
        }
      }

      pushHistory()
      return [...prev, nextPoint]
    })
  }

  const handleSetWallLength = (index: number, meters: number) => {
    if (!Number.isFinite(meters) || meters < 0.3) return
    pushHistory()
    setPoints((prev) => stretchWall(prev, index, meters))
  }

  const handleClear = () => {
    pushHistory()
    setPoints([])
    setIsClosed(false)
    setOpenings([])
    setCurrentPoint(null)
    setCloseBlockedReason(null)
  }

  const handleDeletePoint = (index: number) => {
    if (points.length <= 3) return
    pushHistory()
    setPoints((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCloseShape = () => {
    if (points.length < 3) return
    if (wouldCloseIntersect(points)) {
      setCloseBlockedReason('Контур пересекается, замыкание невозможно')
      return
    }
    setCloseBlockedReason(null)
    pushHistory()
    setIsClosed(true)
  }

  const handleInsertRectangle = () => {
    pushHistory()
    setPoints(rectanglePoints(roomLength || 4, roomWidth || 3))
    setIsClosed(true)
    setOpenings([])
    setCloseBlockedReason(null)
  }

  const persistDraft = (withHint: boolean) => {
    try {
      localStorage.setItem(
        PLANNER_DRAFT_STORAGE_KEY,
        JSON.stringify({
          points,
          isClosed,
          wallHeight,
          objectType,
          selections,
          surfacePrices,
          enabledSurfaces,
          floorThick,
          wallThick,
          brickSize,
          reservePercent,
          inputMode,
          roomLength,
          roomWidth,
          rooms,
          openings,
          step,
        })
      )
      if (withHint) {
        setSavedHint(true)
        window.setTimeout(() => setSavedHint(false), 2500)
      }
    } catch {
      /* private mode */
    }
  }

  const handleSave = () => persistDraft(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as Record<string, unknown>
      skipSizeSyncRef.current = true
      if (Array.isArray(data.points) && data.points.length) setPoints(data.points as Point[])
      if (data.isClosed) setIsClosed(true)
      if (typeof data.wallHeight === 'number') setWallHeight(data.wallHeight)
      if (data.objectType) {
        setObjectType(data.objectType as ObjectTypeId)
        setActiveSurface(SURFACES_BY_OBJECT[data.objectType as ObjectTypeId][0])
      }
      if (data.selections) setSelections(data.selections as Partial<Record<SurfaceId, string>>)
      if (data.surfacePrices) setSurfacePrices(data.surfacePrices as SurfacePrices)
      if (data.enabledSurfaces) setEnabledSurfaces(data.enabledSurfaces as Record<SurfaceId, boolean>)
      if (typeof data.floorThick === 'number') setFloorThick(data.floorThick)
      if (typeof data.wallThick === 'number') setWallThick(data.wallThick)
      if (data.brickSize) setBrickSize(data.brickSize as BrickSize)
      if (typeof data.reservePercent === 'number') setReservePercent(data.reservePercent)
      if (data.inputMode === 'size' || data.inputMode === 'draw') setInputMode(data.inputMode)
      if (typeof data.roomLength === 'number') setRoomLength(data.roomLength)
      if (typeof data.roomWidth === 'number') setRoomWidth(data.roomWidth)
      if (Array.isArray(data.rooms) && data.rooms.length) setRooms(data.rooms as PlannerRoom[])
      if (Array.isArray(data.openings)) setOpenings(data.openings as PlannerOpening[])
      if (data.step === 0 || data.step === 1 || data.step === 2 || data.step === 3) setStep(data.step)
      window.setTimeout(() => {
        skipSizeSyncRef.current = false
      }, 0)
    } catch {
      skipSizeSyncRef.current = false
    }
  }, [])

  const handleObjectType = (t: ObjectTypeId) => {
    const sel = defaultSelections(t)
    setObjectType(t)
    setEnabledSurfaces(defaultEnabledSurfaces(t))
    setSelections(sel)
    setSurfacePrices(pricesFromSelections(sel))
    setActiveSurface(SURFACES_BY_OBJECT[t][0])
    if (t === 'apartment' && rooms.length === 0) setRooms([defaultRoom()])
  }

  const handleInputMode = (m: PlannerInputMode) => {
    setInputMode(m)
    setDrawTool('draw')
    setCloseBlockedReason(null)
    if (m === 'draw' && points.length === 0) {
      setPoints(rectanglePoints(roomLength, roomWidth))
      setIsClosed(true)
    }
  }

  const handleSelectMaterial = (surface: SurfaceId, matId: string) => {
    setSelections((prev) => ({ ...prev, [surface]: matId }))
    const mat = findMatById(matId)
    if (mat) {
      setSurfacePrices((prev) => ({
        ...prev,
        [surface]: { material: mat.materialPrice, work: mat.workPrice },
      }))
    }
    const preset = BRICK_PRESETS[matId]
    if (preset) setBrickSize((prev) => ({ ...prev, ...preset }))
  }

  const shareText = useMemo(
    () =>
      buildEstimateShareText({
        objectType,
        floorArea,
        wallArea: wallAreaNet,
        ceilingArea,
        perimeter,
        wallHeight,
        calcLines,
        materialTotal,
        workTotal: workTotalCalc,
        grandTotal: grandTotalCalc,
      }),
    [
      objectType,
      floorArea,
      wallAreaNet,
      ceilingArea,
      perimeter,
      wallHeight,
      calcLines,
      materialTotal,
      workTotalCalc,
      grandTotalCalc,
    ]
  )

  const handleShare = async () => {
    persistDraft(false)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Смета VayMaster', text: shareText })
        return
      }
      await navigator.clipboard.writeText(shareText)
      setShareHint('Смета скопирована')
      window.setTimeout(() => setShareHint(null), 2500)
    } catch {
      try {
        await navigator.clipboard.writeText(shareText)
        setShareHint('Смета скопирована')
        window.setTimeout(() => setShareHint(null), 2500)
      } catch {
        setShareHint('Не удалось поделиться')
        window.setTimeout(() => setShareHint(null), 2500)
      }
    }
  }

  const handleCreateOrder = () => {
    persistDraft(false)
    const draft = buildOrderDraft({
      objectType,
      floorArea,
      wallHeight,
      calcLines,
      grandTotal: grandTotalCalc,
      shareText,
    })
    try {
      sessionStorage.setItem(PLANNER_ORDER_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      /* ignore */
    }
    if (!user) {
      router.push(loginUrl('/orders/new'))
      return
    }
    router.push('/orders/new')
  }

  const showCanvasHint =
    inputMode === 'draw' &&
    ((drawTool === 'draw' && points.length === 0 && !isClosed) ||
      ((drawTool === 'door' || drawTool === 'window') && polygonClosed))

  const hintText =
    drawTool === 'door'
      ? 'Нажмите на стену — поставим дверь 0,9×2,1'
      : drawTool === 'window'
        ? 'Нажмите на стену — поставим окно 1,2×1,4'
        : 'Тап — угол. Длина стены видна сразу, пока тянете.'

  const canvas = (
    <PlannerCanvas
      svgRef={svgRef}
      viewBox={viewBox}
      gridStep={gridStep}
      points={points}
      isClosed={isClosed}
      currentPoint={currentPoint}
      openings={openings}
      draggingPointIndex={draggingPointIndex}
      floorArea={floorArea}
      interactive={inputMode === 'draw' && step === 0}
      compact={step !== 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDeletePoint={handleDeletePoint}
    />
  )

  return (
    <>
      <Navbar />
      <PlannerSinglePage
        step={step}
        onStep={setStep}
        objectType={objectType}
        onObjectType={handleObjectType}
        inputMode={inputMode}
        onInputMode={handleInputMode}
        roomLength={roomLength}
        roomWidth={roomWidth}
        onRoomLength={(n) => setRoomLength(clampMeters(n))}
        onRoomWidth={(n) => setRoomWidth(clampMeters(n))}
        rooms={rooms}
        onAddRoom={() =>
          setRooms((prev) => [...prev, { id: newRoomId(), name: `Комната ${prev.length + 1}`, length: 4, width: 3 }])
        }
        onUpdateRoom={(id, patch) =>
          setRooms((prev) =>
            prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    ...patch,
                    length: patch.length != null ? clampMeters(patch.length) : r.length,
                    width: patch.width != null ? clampMeters(patch.width) : r.width,
                  }
                : r
            )
          )
        }
        onRemoveRoom={(id) => setRooms((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))}
        hasBottomNav={Boolean(user) && !authLoading}
        onSave={handleSave}
        savedHint={savedHint}
        drawTool={drawTool}
        onDrawTool={setDrawTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onCloseShape={handleCloseShape}
        onInsertRectangle={handleInsertRectangle}
        canRedo={redoStack.length > 0}
        canClose={points.length >= 3 && !isClosed}
        showCanvasHint={showCanvasHint}
        hintText={hintText}
        closeBlockedReason={closeBlockedReason}
        floorArea={floorArea}
        wallArea={wallAreaNet}
        ceilingArea={ceilingArea}
        perimeter={perimeter}
        wallHeight={wallHeight}
        onWallHeightChange={(h) => setWallHeight(clampMeters(h, 2, 6))}
        activeSurface={activeSurface}
        onActiveSurface={setActiveSurface}
        enabledSurfaces={enabledSurfaces}
        onToggleSurface={(s) => setEnabledSurfaces((prev) => ({ ...prev, [s]: !prev[s] }))}
        selections={selections}
        onSelectMaterial={handleSelectMaterial}
        brickSize={brickSize}
        onBrickSize={setBrickSize}
        wastePercent={reservePercent}
        onWastePercent={setReservePercent}
        floorThick={floorThick}
        wallThick={wallThick}
        onFloorThick={setFloorThick}
        onWallThick={setWallThick}
        surfacePrices={surfacePrices}
        onSurfacePriceChange={(surface, field, value) =>
          setSurfacePrices((prev) => ({
            ...prev,
            [surface]: {
              material: field === 'material' ? value : (prev[surface]?.material ?? 0),
              work: field === 'work' ? value : (prev[surface]?.work ?? 0),
            },
          }))
        }
        calcLines={calcLines}
        materialTotal={materialTotal}
        workTotal={workTotalCalc}
        grandTotal={grandTotalCalc}
        recommendedMasters={recommendedMasters}
        recommendedProducts={recommendedProducts}
        recommendationsLoading={recommendationsLoading}
        isGuest={!user}
        onCreateOrder={handleCreateOrder}
        onShare={handleShare}
        shareHint={shareHint}
        wallLengths={drawnWallLengths}
        onSetWallLength={handleSetWallLength}
      >
        {canvas}
      </PlannerSinglePage>
    </>
  )
}
