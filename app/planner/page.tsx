'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import PlannerSinglePage from '@/components/planner/PlannerSinglePage'
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
  type MatOption,
  type ObjectTypeId,
  type SurfaceId,
  type SurfacePrices,
} from '@/components/planner/planner-ui-data'
import type { RecommendedMaster, RecommendedProduct } from '@/components/planner/planner-types'
import {
  polygonArea,
  polygonPerimeter,
  wouldCloseIntersect,
  snapToGrid,
  snapToAngle,
  segmentIndexNearPoint,
  closestPointOnSegment,
  PLANNER_GRID_STEP,
  type Point,
} from '@/lib/planner-geometry'

type ServiceItem = {
  id: string
  name: string
  slug?: string
  subcategory_id?: string
  specialization_id?: string
}

const PLANNER_STORAGE_KEY = 'vay-planner-draft'

function findServiceForMat(mats: MatOption[], matId: string, list: ServiceItem[]): string {
  const mat = mats.find((m) => m.id === matId)
  if (!mat) return ''
  const lower = (v: string) => v.toLowerCase()
  for (const kw of mat.keywords) {
    const hit = list.find((s) => lower(s.name).includes(kw.toLowerCase()))
    if (hit) return hit.id
  }
  return ''
}

/** Ключевые слова для фильтра услуг «Стены» — из нашей системы (services) */
const WALL_KEYWORDS = [
  'штукатур', 'шпакл', 'покрас', 'обои', 'плитк', 'панел', 'гипс', 'кирпич',
  'блок', 'бетон', 'изоляц', 'утепл', 'потолок', 'стен', 'окраск', 'штукатурк',
]

/** Ключевые слова для фильтра услуг «Пол» — из нашей системы (services) */
const FLOOR_KEYWORDS = [
  'стяжка', 'пол', 'ламинат', 'паркет', 'бетон', 'наливной', 'плитка',
  'полусухая', 'мокрая', 'армирован', 'укладка ламината', 'укладка паркета',
  'бетонирован', 'теплый пол',
]

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [objectType, setObjectType] = useState<ObjectTypeId>('room')
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('floor')
  const [enabledSurfaces, setEnabledSurfaces] = useState(defaultEnabledSurfaces('room'))
  const [selections, setSelections] = useState<Partial<Record<SurfaceId, string>>>(defaultSelections('room'))
  const [surfacePrices, setSurfacePrices] = useState<SurfacePrices>(() =>
    pricesFromSelections(defaultSelections('room'))
  )
  const [brickSize, setBrickSize] = useState<BrickSize>(DEFAULT_BRICK_SIZE)
  const [savedHint, setSavedHint] = useState(false)
  const [floorThick, setFloorThick] = useState(5)
  const [wallThick, setWallThick] = useState(1.5)
  const [drawTool, setDrawTool] = useState<'draw' | 'door' | 'window'>('draw')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [services, setServices] = useState<ServiceItem[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)

  const [wallHeight, setWallHeight] = useState(2.7)

  const [recommendedMasters, setRecommendedMasters] = useState<RecommendedMaster[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)

  const [canvasWidth, setCanvasWidth] = useState(10)
  const [canvasHeight, setCanvasHeight] = useState(10)
  const [gridStep] = useState(PLANNER_GRID_STEP)
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true)
  const [snapTo45, setSnapTo45] = useState(true)
  const [points, setPoints] = useState<Point[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)
  const [reservePercent, setReservePercent] = useState(10)
  const [cutouts, setCutouts] = useState<Array<{ width: number; height: number }>>([])
  const [closeBlockedReason, setCloseBlockedReason] = useState<string | null>(null)
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null)
  const [history, setHistory] = useState<{ points: Point[]; isClosed: boolean }[]>([])
  const [redoStack, setRedoStack] = useState<{ points: Point[]; isClosed: boolean }[]>([])
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDistanceRef = useRef<number | null>(null)
  const isPinchingRef = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const touchPinchRef = useRef<number | null>(null)
  const zoomRef = useRef(1)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const onTouchStart = (event: TouchEvent) => {
      event.stopPropagation()
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
        const nextZoom = Math.min(3, Math.max(0.6, zoomRef.current * (dist / touchPinchRef.current)))
        setZoom(nextZoom)
        touchPinchRef.current = dist
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      event.stopPropagation()
      if (event.touches.length < 2) {
        touchPinchRef.current = null
        isPinchingRef.current = false
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetchServices()
    }
  }, [user])

  const fetchServices = async () => {
    setServicesLoading(true)
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, slug, subcategory_id')
        .order('name', { ascending: true })

      if (servicesError) throw servicesError

      setServices((servicesData as ServiceItem[]) || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices([])
    } finally {
      setServicesLoading(false)
    }
  }

  const serviceOptions = useMemo(() => {
    const nameLower = (name: string) => name.toLowerCase()
    const base = services.filter((s) =>
      FLOOR_KEYWORDS.some((kw) => nameLower(s.name).includes(kw))
    )
    const hasWarmFloor = services.some((s) => nameLower(s.name).includes('теплый пол'))
    const warmFloorOption = hasWarmFloor ? [{ id: 'warm-floor', name: 'Теплый пол', slug: undefined, subcategory_id: undefined }] : []
    const list = [...base, ...warmFloorOption]
    return list.length > 0 ? list : services
  }, [services])

  const selectedServiceName = useMemo(() => {
    if (selectedServiceId === 'warm-floor') return 'Теплый пол'
    return services.find((service) => service.id === selectedServiceId)?.name || ''
  }, [services, selectedServiceId])

  const isWarmFloor = selectedServiceId === 'warm-floor'

  const normalizeKeyword = (value: string) => {
    if (value.length <= 4) return value
    if (/[аеиоуыяю]$/i.test(value)) {
      return value.slice(0, -1)
    }
    return value
  }

  const extractKeywords = (value: string) => {
    const stopWords = new Set([
      'укладка',
      'монтаж',
      'установка',
      'ремонт',
      'подготовка',
      'работы',
      'работа',
      'нанесение',
      'нанесения',
      'облицовка',
      'устройство',
      'под',
      'по',
      'для',
      'на',
      'в',
      'из',
      'с',
    ])
    const tokens = value
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]+/gi, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !stopWords.has(token) && token.length >= 3)
    const normalized = tokens.map(normalizeKeyword)
    return Array.from(new Set([...normalized, ...tokens])).slice(0, 6)
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      setRecommendationsLoading(true)
      try {
        const productsBase = supabase
          .from('products')
          .select(
            `id, name, price, images, seller:profiles(id, full_name, avatar_url), category_ref:product_categories(id, name, section, slug)`
          )
          .eq('in_stock', true)
          .eq('category_ref.section', 'construction')
          .order('created_at', { ascending: false })
          .limit(12)

        let profileIds: string[] = []
        if (selectedServiceId) {
          const keywords = extractKeywords(selectedServiceName || '')
          const orParts = keywords.flatMap((keyword) => {
            const safeKeyword = keyword.replace(/[%_]/g, '')
            return [`name.ilike.%${safeKeyword}%`, `description.ilike.%${safeKeyword}%`]
          })

          if (isWarmFloor) {
            const { data: warmServices, error: warmError } = await supabase
              .from('services')
              .select('id')
              .ilike('name', '%теплый пол%')
            if (!warmError && warmServices?.length) {
              const warmIds = (warmServices || []).map((row) => row.id as string)
              const { data, error } = await supabase
                .from('profile_services')
                .select('profile_id')
                .in('service_id', warmIds)
              if (!error && data) profileIds = data.map((row) => row.profile_id as string)
            }
          } else {
            const { data, error } = await supabase
              .from('profile_services')
              .select('profile_id')
              .eq('service_id', selectedServiceId)
            if (!error && data) profileIds = data.map((row) => row.profile_id as string)
          }

          const productsResult =
            orParts.length > 0
              ? await productsBase.or(orParts.join(','))
              : await productsBase
          if (productsResult.error) throw productsResult.error
          setRecommendedProducts((productsResult.data as RecommendedProduct[]) || [])
        } else {
          const productsResult = await productsBase
          if (productsResult.error) throw productsResult.error
          setRecommendedProducts((productsResult.data as RecommendedProduct[]) || [])
        }

        let mastersData: RecommendedMaster[] = []
        if (profileIds.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, master_rating, master_reviews_count')
            .eq('role', 'master')
            .in('id', profileIds)
            .order('master_rating', { ascending: false, nullsFirst: false })
            .limit(12)
          if (!error && data) mastersData = data as RecommendedMaster[]
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, master_rating, master_reviews_count')
            .eq('role', 'master')
            .order('master_rating', { ascending: false, nullsFirst: false })
            .limit(12)
          if (!error && data) mastersData = data as RecommendedMaster[]
        }
        setRecommendedMasters(mastersData)
      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setRecommendedProducts([])
        setRecommendedMasters([])
      } finally {
        setRecommendationsLoading(false)
      }
    }

    fetchRecommendations()
  }, [selectedServiceId, selectedServiceName, isWarmFloor])

  const polygonClosed = isClosed && points.length >= 3

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, { points: [...points], isClosed }])
    setRedoStack([])
  }, [points, isClosed])

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      setRedoStack((r) => [...r, { points: [...points], isClosed }])
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      setPoints(prev.points)
      setIsClosed(prev.isClosed)
      setCloseBlockedReason(null)
      setDraggingPointIndex(null)
      return
    }
    if (points.length === 0) return
    setPoints((prev) => prev.slice(0, -1))
    setIsClosed(false)
    setCurrentPoint(null)
    setCloseBlockedReason(null)
  }, [history, points, isClosed])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((r) => r.slice(0, -1))
    setPoints(next.points)
    setIsClosed(next.isClosed)
    setCloseBlockedReason(null)
  }, [redoStack])

  const metersToParts = (meters: number) => {
    if (!Number.isFinite(meters)) return { m: 0, cm: 0 }
    const totalCm = Math.round(meters * 100)
    const m = Math.floor(totalCm / 100)
    const cm = totalCm % 100
    return { m, cm }
  }

  const estimateCharWidth = (char: string) => {
    if (char === '.') return 0.04
    if (char === ' ' || char === '№') return 0.05
    return 0.065
  }

  const buildLabelParts = (meters: number) => {
    const label = `${meters.toFixed(1)} м`
    const segments = label.split('')
    const gap = 0.09
    const widths = segments.map((segment) => estimateCharWidth(segment))
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (segments.length - 1)
    return { segments, widths, total, gap }
  }

  const buildTextParts = (text: string) => {
    const segments = text.split('')
    const gap = 0.06
    const widths = segments.map((segment) => estimateCharWidth(segment) + gap)
    const total = widths.reduce((sum, w) => sum + w, 0)
    return { segments, widths, total, gap }
  }

  const floorArea = useMemo(() => (polygonClosed ? polygonArea(points) : 0), [points, polygonClosed])
  const perimeter = useMemo(() => (polygonClosed ? polygonPerimeter(points) : 0), [points, polygonClosed])

  const cutoutsArea = useMemo(
    () => cutouts.reduce((sum, c) => sum + Math.max(0, c.width) * Math.max(0, c.height), 0),
    [cutouts]
  )
  const wallAreaTotal = useMemo(() => {
    const h = Math.max(0, wallHeight)
    return perimeter * h
  }, [perimeter, wallHeight])
  const wallAreaNet = Math.max(0, wallAreaTotal - cutoutsArea)

  const ceilingArea = floorArea

  const calcLines = useMemo(
    () =>
      buildCalcLines({
        objectType,
        enabledSurfaces,
        selections,
        matsBySurface: MATS_BY_SURFACE,
        areas: { floor: floorArea, walls: wallAreaNet, ceiling: ceilingArea, perimeter },
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

  useEffect(() => {
    const matId = selections[activeSurface]
    if (!matId) return
    const mat = findMatById(matId)
    if (!mat) return
    const next = findServiceForMat(MATS_BY_SURFACE[mat.surface], matId, services)
    if (next) setSelectedServiceId(next)
  }, [selections, activeSurface, services])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLANNER_STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as {
        points?: Point[]
        isClosed?: boolean
        wallHeight?: number
        objectType?: ObjectTypeId
        selections?: Partial<Record<SurfaceId, string>>
        surfacePrices?: SurfacePrices
        enabledSurfaces?: Record<SurfaceId, boolean>
        floorThick?: number
        wallThick?: number
        brickSize?: BrickSize
        reservePercent?: number
      }
      if (data.points?.length) setPoints(data.points)
      if (data.isClosed) setIsClosed(true)
      if (data.wallHeight) setWallHeight(data.wallHeight)
      if (data.objectType) {
        setObjectType(data.objectType)
        setActiveSurface(SURFACES_BY_OBJECT[data.objectType][0])
      }
      if (data.selections) setSelections(data.selections)
      if (data.surfacePrices) setSurfacePrices(data.surfacePrices)
      if (data.enabledSurfaces) setEnabledSurfaces(data.enabledSurfaces)
      if (data.floorThick) setFloorThick(data.floorThick)
      if (data.wallThick) setWallThick(data.wallThick)
      if (data.brickSize) setBrickSize(data.brickSize)
      if (data.reservePercent != null) setReservePercent(data.reservePercent)
    } catch {
      /* ignore corrupt draft */
    }
  }, [])

  const previewWidth = Math.max(1, canvasWidth)
  const previewHeight = Math.max(1, canvasHeight)

  const getPointFromEvent = (
    event: React.PointerEvent<SVGSVGElement>,
    lastPoint?: Point | null
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    const rawX = ((event.clientX - rect.left) / rect.width) * previewWidth
    const rawY = ((event.clientY - rect.top) / rect.height) * previewHeight
    const x = rawX / zoom
    const y = rawY / zoom
    let p: Point = { x, y }
    if (snapToGridEnabled) p = snapToGrid(p, gridStep)
    if (lastPoint && snapTo45) {
      const len = Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y)
      if (len >= 0.05) p = snapToAngle(lastPoint, p, len, true)
      if (snapToGridEnabled) p = snapToGrid(p, gridStep)
    }
    return p
  }

  const updatePointers = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    pointersRef.current.set(event.pointerId, { x, y })
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drawTool !== 'draw') return
    if (event.pointerType === 'touch' && isPinchingRef.current) return
    svgRef.current?.setPointerCapture(event.pointerId)
    updatePointers(event)

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      isPinchingRef.current = true
      pinchDistanceRef.current = dist
      setIsDrawing(false)
      setCurrentPoint(null)
      return
    }

    if (isClosed) {
      const rect = event.currentTarget.getBoundingClientRect()
      const rawX = ((event.clientX - rect.left) / rect.width) * previewWidth / zoom
      const rawY = ((event.clientY - rect.top) / rect.height) * previewHeight / zoom
      const p: Point = { x: rawX, y: rawY }
      for (let i = 0; i < points.length; i++) {
        const dist = Math.hypot(p.x - points[i].x, p.y - points[i].y)
        if (dist <= 0.2) {
          setDraggingPointIndex(i)
          return
        }
      }
      const segIdx = segmentIndexNearPoint(points, p, 0.25)
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
        return
      }
      return
    }

    setIsDrawing(true)
    setCurrentPoint(getPointFromEvent(event))
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drawTool !== 'draw') return
    if (event.pointerType === 'touch' && isPinchingRef.current) return
    updatePointers(event)

    if (isPinchingRef.current && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinchDistanceRef.current) {
        const nextZoom = Math.min(3, Math.max(0.6, zoom * (dist / pinchDistanceRef.current)))
        setZoom(nextZoom)
        pinchDistanceRef.current = dist
      }
      return
    }

    if (draggingPointIndex !== null) {
      const newP = getPointFromEvent(event)
      setPoints((prev) => {
        const next = [...prev]
        next[draggingPointIndex!] = newP
        return next
      })
      return
    }

    if (!isDrawing || isClosed) return
    const last = points.length > 0 ? points[points.length - 1] : null
    setCurrentPoint(getPointFromEvent(event, last))
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drawTool !== 'draw') return
    pointersRef.current.delete(event.pointerId)
    svgRef.current?.releasePointerCapture(event.pointerId)

    if (isPinchingRef.current && pointersRef.current.size < 2) {
      isPinchingRef.current = false
      pinchDistanceRef.current = null
      return
    }

    if (draggingPointIndex !== null) {
      setDraggingPointIndex(null)
      return
    }

    if (!isDrawing) return
    const last = points.length > 0 ? points[points.length - 1] : null
    let nextPoint = currentPoint || getPointFromEvent(event, last)
    if (snapToGridEnabled) nextPoint = snapToGrid(nextPoint, gridStep)
    setIsDrawing(false)
    setCurrentPoint(null)

    setPoints((prev) => {
      const minDistance = Math.max(0.05, gridStep * 0.5)
      if (prev.length > 0) {
        const dist = Math.hypot(nextPoint.x - prev[prev.length - 1].x, nextPoint.y - prev[prev.length - 1].y)
        if (dist < minDistance) return prev
      }

      if (prev.length >= 2) {
        const first = prev[0]
        const closeDistance = Math.max(0.15, gridStep * 2)
        const distance = Math.hypot(nextPoint.x - first.x, nextPoint.y - first.y)
        if (distance <= closeDistance) {
          if (wouldCloseIntersect([...prev, nextPoint])) {
            setCloseBlockedReason('Замыкание отменено: контур самопересекается')
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


  const handleUndoPoint = () => {
    if (points.length === 0) return
    pushHistory()
    setPoints((prev) => prev.slice(0, -1))
    setIsClosed(false)
    setCurrentPoint(null)
    setCloseBlockedReason(null)
  }

  const handleClear = () => {
    pushHistory()
    setPoints([])
    setIsClosed(false)
    setCurrentPoint(null)
    setCloseBlockedReason(null)
  }

  const handleDeletePoint = (index: number) => {
    if (points.length <= 3) return
    pushHistory()
    setPoints((prev) => prev.filter((_, i) => i !== index))
  }

  const centroid = useMemo(() => {
    if (!polygonClosed) return null
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
  }, [points, polygonClosed])

  const handleCloseShape = () => {
    if (points.length < 3) return
    if (wouldCloseIntersect(points)) {
      setCloseBlockedReason('Контур самопересекается, замыкание невозможно')
      return
    }
    setCloseBlockedReason(null)
    pushHistory()
    setIsClosed(true)
  }

  const handleSave = () => {
    try {
      localStorage.setItem(
        PLANNER_STORAGE_KEY,
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
          calcLines,
          materialTotal,
          workTotal: workTotalCalc,
          grandTotal: grandTotalCalc,
        })
      )
      setSavedHint(true)
      window.setTimeout(() => setSavedHint(false), 2500)
    } catch {
      /* storage full / private mode */
    }
  }

  const handleObjectType = (t: ObjectTypeId) => {
    const sel = defaultSelections(t)
    setObjectType(t)
    setEnabledSurfaces(defaultEnabledSurfaces(t))
    setSelections(sel)
    setSurfacePrices(pricesFromSelections(sel))
    setActiveSurface(SURFACES_BY_OBJECT[t][0])
  }

  const handleToggleSurface = (s: SurfaceId) => {
    setEnabledSurfaces((prev) => ({ ...prev, [s]: !prev[s] }))
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

  const handleSurfacePriceChange = (surface: SurfaceId, field: 'material' | 'work', value: number) => {
    setSurfacePrices((prev) => ({
      ...prev,
      [surface]: {
        material: field === 'material' ? value : (prev[surface]?.material ?? 0),
        work: field === 'work' ? value : (prev[surface]?.work ?? 0),
      },
    }))
  }

  const showCanvasHint = points.length === 0 && !isClosed

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-28">
        <Navbar />
        <div className="bg-white border-b border-[#e5e5ea]/80 px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#f2f2f7] animate-pulse" />
          <div className="h-4 flex-1 bg-[#f2f2f7] rounded animate-pulse" />
          <div className="h-8 w-16 bg-[#f2f2f7] rounded-lg animate-pulse" />
        </div>
        <div className="mx-3 mt-3 h-[280px] bg-white rounded-xl border border-[#e5e5ea]/80 animate-pulse" />
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <PlannerSinglePage
      objectType={objectType}
      onObjectType={handleObjectType}
      onBack={() => router.back()}
      onSave={handleSave}
      savedHint={savedHint}
      drawTool={drawTool}
      onDrawTool={setDrawTool}
      onUndo={handleUndo}
      showCanvasHint={showCanvasHint}
      floorArea={floorArea}
      wallArea={wallAreaNet}
      ceilingArea={ceilingArea}
      perimeter={perimeter}
      wallHeight={wallHeight}
      onWallHeightChange={setWallHeight}
      activeSurface={activeSurface}
      onActiveSurface={setActiveSurface}
      enabledSurfaces={enabledSurfaces}
      onToggleSurface={handleToggleSurface}
      selections={selections}
      onSelectMaterial={handleSelectMaterial}
      brickSize={brickSize}
      onBrickSize={setBrickSize}
      wastePercent={reservePercent}
      onWastePercent={setReservePercent}
      surfacePrices={surfacePrices}
      onSurfacePriceChange={handleSurfacePriceChange}
      calcLines={calcLines}
      materialTotal={materialTotal}
      workTotal={workTotalCalc}
      grandTotal={grandTotalCalc}
      recommendedMasters={recommendedMasters}
      recommendedProducts={recommendedProducts}
      recommendationsLoading={recommendationsLoading}
    >
      <div className="relative">
        {closeBlockedReason && (
          <div className="absolute left-3 bottom-3 right-3 px-2 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs z-20">
            {closeBlockedReason}
          </div>
        )}
        <svg
                      ref={svgRef}
                      viewBox={`0 0 ${previewWidth} ${previewHeight}`}
          className="w-full h-[280px] touch-none block"
                      style={{ touchAction: 'none' }}
                      preserveAspectRatio="none"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      shapeRendering="crispEdges"
                    >
                      <defs>
                        <pattern id="grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                          <path
                            d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`}
                            fill="none"
                            stroke="#f0f0f5"
                            strokeWidth="0.02"
                          />
                        </pattern>
                      </defs>
                      <g transform={`scale(${zoom})`} transformOrigin="50% 50%">
                        <rect width="100%" height="100%" fill="#ffffff" />
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {points.length > 1 && !isClosed && (
                          <polyline
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#1c1c1e"
                            strokeWidth="0.12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {points.length > 2 && isClosed && (
                          <polygon
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(192,57,43,0.06)"
                            stroke="#1c1c1e"
                            strokeWidth="0.12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {points.length > 1 &&
                          points.slice(1).map((p, index) => {
                            const prev = points[index]
                            const midX = (prev.x + p.x) / 2
                            const midY = (prev.y + p.y) / 2
                            const length = Math.hypot(p.x - prev.x, p.y - prev.y)
                            const labelParts = buildLabelParts(length)
                            const dx = p.x - prev.x
                            const dy = p.y - prev.y
                            let angle = (Math.atan2(dy, dx) * 180) / Math.PI
                            if (angle > 90 || angle < -90) angle += 180
                            const len = Math.hypot(dx, dy) || 1
                            const nx = -dy / len
                            const ny = dx / len
                            const offset = 0.4
                            const labelX = midX + nx * offset
                            const labelY = midY + ny * offset
                            return (
                              <g key={`len-${index}`} transform={`translate(${labelX} ${labelY}) rotate(${angle})`}>
                                <rect
                                  x={-labelParts.total / 2 - 0.08}
                                  y={-0.22}
                                  width={labelParts.total + 0.16}
                                  height={0.44}
                                  fill="rgba(255,255,255,0.85)"
                                  rx={0.04}
                                />
                                <text
                                  x={0}
                                  y={0}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize="0.28"
                                  fill="#c0392b"
                                  fontWeight="700"
                                  letterSpacing="0.02em"
                                  direction="ltr"
                                  unicodeBidi="plaintext"
                                >
                                  {labelParts.segments.map((segment, segIndex) => {
                                    const offsetX =
                                      labelParts.widths.slice(0, segIndex).reduce((sum, w) => sum + w, 0) +
                                      labelParts.gap * segIndex -
                                      labelParts.total / 2
                                    return (
                                      <tspan key={`${segment}-${segIndex}`} x={offsetX} dy={0}>
                                        {segment}
                                      </tspan>
                                    )
                                  })}
                                </text>
                              </g>
                            )
                          })}

                        {!isClosed && points.length > 0 && currentPoint && (
                          <line
                            x1={points[points.length - 1].x}
                            y1={points[points.length - 1].y}
                            x2={currentPoint.x}
                            y2={currentPoint.y}
                            stroke="rgba(192,57,43,0.5)"
                            strokeWidth="0.08"
                            strokeDasharray="0.08 0.08"
                            strokeLinecap="round"
                          />
                        )}

                        {!isClosed && points.length > 0 && currentPoint && (() => {
                          const length = Math.hypot(
                            currentPoint.x - points[points.length - 1].x,
                            currentPoint.y - points[points.length - 1].y
                          )
                          const labelParts = buildLabelParts(length)
                          const midX = (points[points.length - 1].x + currentPoint.x) / 2
                          const midY = (points[points.length - 1].y + currentPoint.y) / 2
                          return (
                            <g transform={`translate(${midX} ${midY})`}>
                              <rect
                                x={-labelParts.total / 2 - 0.08}
                                y={-0.67}
                                width={labelParts.total + 0.16}
                                height={0.44}
                                fill="rgba(255,255,255,0.85)"
                                rx={0.04}
                              />
                              <text
                                x={0}
                                y={-0.45}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="0.28"
                                fill="#c0392b"
                                fontWeight="700"
                                letterSpacing="0.02em"
                                direction="ltr"
                                unicodeBidi="plaintext"
                              >
                                {labelParts.segments.map((segment, segIndex) => {
                                  const offsetX =
                                    labelParts.widths.slice(0, segIndex).reduce((sum, w) => sum + w, 0) +
                                    labelParts.gap * segIndex -
                                    labelParts.total / 2
                                  return (
                                    <tspan key={`${segment}-${segIndex}`} x={offsetX} dy={0}>
                                      {segment}
                                    </tspan>
                                  )
                                })}
                              </text>
                            </g>
                          )
                        })()}

                        {points.map((p, index) => (
                          <g
                            key={`node-${index}`}
                            onContextMenu={(e) => {
                              if (isClosed && points.length > 3) {
                                e.preventDefault()
                                handleDeletePoint(index)
                              }
                            }}
                            style={{ cursor: isClosed ? (draggingPointIndex === index ? 'grabbing' : 'grab') : 'default' }}
                          >
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isClosed ? 0.1 : 0.08}
                              fill="#c0392b"
                              stroke="#ffffff"
                              strokeWidth="0.02"
                            />
                            {isClosed && points.length > 3 && (
                              <title>Перетащите для перемещения. ПКМ — удалить точку.</title>
                            )}
                          </g>
                        ))}

                        {points.length >= 3 && !isClosed && (
                          <circle
                            cx={points[0].x}
                            cy={points[0].y}
                            r="0.1"
                            fill="none"
                            stroke="#c0392b"
                            strokeWidth="0.04"
                            strokeDasharray="0.06 0.04"
                          />
                        )}

                        {polygonClosed && centroid && (
                          <g>
                            <text
                              x={centroid.x}
                              y={centroid.y}
                              textAnchor="start"
                              dominantBaseline="middle"
                              fontSize="0.28"
                              fill="#c0392b"
                              fontWeight="700"
                              letterSpacing="0.02em"
                              direction="ltr"
                              unicodeBidi="plaintext"
                            >
                              {(() => {
                                const parts = buildTextParts(`${floorArea.toFixed(2)} м²`)
                                return parts.segments.map((segment, segIndex) => {
                                  const offsetX =
                                    parts.widths.slice(0, segIndex).reduce((sum, w) => sum + w, 0) +
                                    parts.gap * segIndex -
                                    parts.total / 2
                                  return (
                                    <tspan key={`${segment}-${segIndex}`} x={centroid.x + offsetX} dy={0}>
                                      {segment}
                                    </tspan>
                                  )
                                })
                              })()}
                            </text>
                          </g>
                        )}
                      </g>
                    </svg>
      </div>
    </PlannerSinglePage>
    </>
  )
}
