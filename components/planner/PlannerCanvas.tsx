'use client'

import type { PointerEvent, RefObject } from 'react'
import {
  formatWallLength,
  pointOnSegment,
  polygonCentroid,
  segmentLength,
  separatePoints,
  wallLabelAnchor,
  type Point,
} from '@/lib/planner-geometry'
import type { PlannerOpening } from './planner-types'

type ViewBox = { x: number; y: number; w: number; h: number }

type PlannerCanvasProps = {
  svgRef: RefObject<SVGSVGElement>
  viewBox: ViewBox
  gridStep: number
  points: Point[]
  isClosed: boolean
  currentPoint: Point | null
  openings: PlannerOpening[]
  draggingPointIndex: number | null
  floorArea: number
  interactive: boolean
  compact?: boolean
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void
  onDeletePoint: (index: number) => void
}

function strokeForView(viewBox: ViewBox) {
  const m = Math.max(viewBox.w, viewBox.h)
  return Math.max(0.04, m * 0.012)
}

function LengthBadge({
  pos,
  text,
  font,
  live,
}: {
  pos: Point
  text: string
  font: number
  live?: boolean
}) {
  const pillW = font * (live ? 4.6 : 3.9)
  const pillH = font * (live ? 1.75 : 1.55)
  return (
    <g>
      <rect
        x={pos.x - pillW / 2}
        y={pos.y - pillH / 2}
        width={pillW}
        height={pillH}
        rx={font * 0.28}
        fill={live ? '#c7362f' : 'rgba(255,255,255,0.94)'}
        stroke={live ? '#c7362f' : 'none'}
      />
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={live ? font * 1.08 : font}
        fill={live ? '#ffffff' : '#c7362f'}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        style={{ letterSpacing: 0 }}
      >
        {text}
      </text>
    </g>
  )
}

export default function PlannerCanvas({
  svgRef,
  viewBox,
  gridStep,
  points,
  isClosed,
  currentPoint,
  openings,
  draggingPointIndex,
  floorArea,
  interactive,
  compact,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDeletePoint,
}: PlannerCanvasProps) {
  const sw = strokeForView(viewBox)
  const font = Math.max(0.26, Math.max(viewBox.w, viewBox.h) * 0.042)
  const nodeR = interactive ? Math.max(0.12, sw * 2.2) : Math.max(0.08, sw * 1.4)
  const centroid = isClosed && points.length >= 3 ? polygonCentroid(points) : null
  const polygonClosed = isClosed && points.length >= 3
  const labelOffset = Math.max(font * 2.6, Math.max(viewBox.w, viewBox.h) * 0.14)
  const lastPoint = points.length > 0 ? points[points.length - 1] : null
  const liveLength =
    !isClosed && lastPoint && currentPoint ? segmentLength(lastPoint, currentPoint) : 0
  const liveLabel =
    liveLength >= 0.05 && lastPoint && currentPoint
      ? {
          text: formatWallLength(liveLength, true),
          pos: wallLabelAnchor(lastPoint, currentPoint, centroid, labelOffset),
        }
      : null
  const wallLabels = (() => {
    if (points.length < 2) return []
    const count = isClosed ? points.length : points.length - 1
    const raw: { text: string; pos: Point; live: boolean }[] = []
    for (let i = 0; i < count; i += 1) {
      const start = points[i]
      const end = points[(i + 1) % points.length]
      const length = segmentLength(start, end)
      if (length < 0.05) continue
      const live = draggingPointIndex === i || draggingPointIndex === (i + 1) % points.length
      raw.push({
        text: formatWallLength(length, live),
        live,
        pos: wallLabelAnchor(start, end, centroid, labelOffset),
      })
    }
    const separated = separatePoints(
      raw.map((item) => item.pos),
      font * 4.2
    )
    return raw.map((item, i) => ({ text: item.text, live: item.live, pos: separated[i] }))
  })()

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      className={`planner-svg touch-none block bg-white mx-auto ${compact ? 'w-[200px] h-[200px]' : 'w-full aspect-square'}`}
      style={{ touchAction: 'none' }}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerLeave={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    >
      <defs>
        <pattern id="planner-grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`}
            fill="none"
            stroke="#ececf1"
            strokeWidth={sw * 0.15}
          />
        </pattern>
      </defs>
      <g>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="#ffffff" />
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#planner-grid)" />

        {points.length > 1 && !isClosed && (
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#1c1c1e"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {polygonClosed && (
          <polygon
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(199,54,47,0.08)"
            stroke="#1c1c1e"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {wallLabels.map((item, index) => (
          <LengthBadge key={`len-${index}`} pos={item.pos} text={item.text} font={font} live={item.live} />
        ))}
        {liveLabel && <LengthBadge pos={liveLabel.pos} text={liveLabel.text} font={font} live />}

        {openings.map((opening) => {
          if (points.length < 2) return null
          const a = points[opening.segmentIndex]
          const b = points[(opening.segmentIndex + 1) % points.length]
          if (!a || !b) return null
          const p = pointOnSegment(a, b, opening.t)
          const mark = opening.type === 'door' ? 'Д' : 'О'
          return (
            <g key={opening.id}>
              <circle cx={p.x} cy={p.y} r={nodeR * 1.35} fill="#fff" stroke="#c7362f" strokeWidth={sw * 0.6} />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={font * 0.85}
                fill="#c7362f"
                fontWeight={700}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                style={{ letterSpacing: 0 }}
              >
                {mark}
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
            stroke="rgba(199,54,47,0.55)"
            strokeWidth={sw * 0.7}
            strokeDasharray={`${sw} ${sw}`}
            strokeLinecap="round"
          />
        )}

        {points.map((p, index) => (
          <circle
            key={`node-${index}`}
            cx={p.x}
            cy={p.y}
            r={draggingPointIndex === index ? nodeR * 1.25 : nodeR}
            fill="#c7362f"
            stroke="#ffffff"
            strokeWidth={sw * 0.35}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (isClosed && points.length > 3) onDeletePoint(index)
            }}
          />
        ))}

        {points.length >= 3 && !isClosed && (
          <circle
            cx={points[0].x}
            cy={points[0].y}
            r={nodeR * 1.6}
            fill="none"
            stroke="#c7362f"
            strokeWidth={sw * 0.45}
            strokeDasharray={`${sw * 0.8} ${sw * 0.5}`}
          />
        )}

        {polygonClosed && centroid && floorArea > 0 && (
          <text
            x={centroid.x}
            y={centroid.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={font * 1.15}
            fill="#c7362f"
            fontWeight={800}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            style={{ letterSpacing: 0 }}
          >
            {`${floorArea.toFixed(1)} м²`}
          </text>
        )}
      </g>
    </svg>
  )
}
