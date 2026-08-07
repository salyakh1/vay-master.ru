import { NextRequest, NextResponse } from 'next/server'
import { findMasterIdsServingLocation } from '@/lib/masters-serve-location'

export const dynamic = 'force-dynamic'

/**
 * GET /api/masters/serve-location?lat=43.13&lng=45.54
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Параметры lat и lng обязательны и должны быть числами' },
        { status: 400 }
      )
    }

    const profileIds = await findMasterIdsServingLocation(lat, lng)
    return NextResponse.json({ profileIds })
  } catch (e) {
    console.error('serve-location error:', e)
    return NextResponse.json(
      { error: 'Ошибка при поиске мастеров по локации' },
      { status: 500 }
    )
  }
}
