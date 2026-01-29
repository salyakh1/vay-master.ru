'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase, User, Product } from '@/lib/supabase'
import { FiMapPin, FiShoppingBag, FiX, FiNavigation, FiFilter } from 'react-icons/fi'
import { configureLeafletIcons } from '@/lib/leaflet'
import 'leaflet/dist/leaflet.css'

// dynamic() ломает типизацию пропсов компонентов react-leaflet — используем any
const MapContainer: any = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup: any = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })
const Circle: any = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false })

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 10

type SellerPoint = {
  seller: User
  lat: number
  lng: number
  productsCount: number
  hasStore: boolean
}

type StoresMapProps = {
  masterLocation?: { lat: number; lng: number; radiusKm: number } | null
  onSellerClick?: (sellerId: string) => void
  className?: string
}

export default function StoresMap({ masterLocation, onSellerClick, className = '' }: StoresMapProps) {
  const [sellers, setSellers] = useState<SellerPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null)
  const [sellerProducts, setSellerProducts] = useState<Record<string, Product[]>>({})
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({})
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null)
  const [onlyPro, setOnlyPro] = useState(false)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  useEffect(() => {
    fetchSellers()
  }, [onlyPro])

  useEffect(() => {
    if (masterLocation) {
      setRadiusFilter(masterLocation.radiusKm)
    }
  }, [masterLocation])

  const fetchSellers = async () => {
    setLoading(true)

    try {
      const now = new Date().toISOString()
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, city, store_address, seller_lat, seller_lng, is_pro, pro_until')
        .eq('role', 'seller')
        .not('seller_lat', 'is', null)
        .not('seller_lng', 'is', null)

      if (onlyPro) {
        query = query.or(`is_pro.eq.true,pro_until.gt.${now}`)
      }

      const { data, error } = await query

      if (error) throw error

      // Получаем количество товаров для каждого продавца
      const sellersWithProducts = await Promise.all(
        (data || []).map(async (seller: any) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', seller.id)
            .eq('in_stock', true)

          return {
            seller: seller as User,
            lat: Number(seller.seller_lat),
            lng: Number(seller.seller_lng),
            productsCount: count || 0,
            hasStore: !!seller.store_address,
          }
        })
      )

      // Фильтруем по радиусу, если указан
      let filteredSellers = sellersWithProducts
      if (radiusFilter && masterLocation) {
        filteredSellers = sellersWithProducts.filter((point) => {
          const distance = calculateDistance(
            masterLocation.lat,
            masterLocation.lng,
            point.lat,
            point.lng
          )
          return distance <= radiusFilter
        })
      }

      setSellers(filteredSellers)
    } catch (error) {
      console.error('Error fetching sellers:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Радиус Земли в км
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const fetchSellerProducts = async (sellerId: string) => {
    if (sellerProducts[sellerId] || loadingProducts[sellerId]) return

    setLoadingProducts((prev) => ({ ...prev, [sellerId]: true }))

    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          price,
          images,
          rating,
          reviews_count,
          category_ref:product_categories(name, slug),
          subcategory_ref:product_subcategories(name, slug)
        `
        )
        .eq('seller_id', sellerId)
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setSellerProducts((prev) => ({ ...prev, [sellerId]: (data || []) as unknown as Product[] }))
    } catch (error) {
      console.error('Error fetching seller products:', error)
    } finally {
      setLoadingProducts((prev) => ({ ...prev, [sellerId]: false }))
    }
  }

  useEffect(() => {
    if (selectedSeller) {
      fetchSellerProducts(selectedSeller)
    }
  }, [selectedSeller])

  useEffect(() => {
    if (sellers.length > 0 && mapRef.current) {
      void import('leaflet').then((L) => {
        if (!mapRef.current) return

        const bounds = L.latLngBounds(
          sellers.map((p) => [p.lat, p.lng] as [number, number])
        )
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
      })
    }
  }, [sellers])

  const handleMarkerClick = (sellerId: string) => {
    setSelectedSeller(sellerId)
    if (onSellerClick) {
      onSellerClick(sellerId)
    }
  }

  const center = useMemo(() => {
    if (masterLocation) {
      return [masterLocation.lat, masterLocation.lng] as [number, number]
    }
    if (sellers.length > 0) {
      const avgLat = sellers.reduce((sum, p) => sum + p.lat, 0) / sellers.length
      const avgLng = sellers.reduce((sum, p) => sum + p.lng, 0) / sellers.length
      return [avgLat, avgLng] as [number, number]
    }
    return DEFAULT_CENTER
  }, [masterLocation, sellers])

  return (
    <div className={`stores-map ${className}`}>
      {/* Фильтры */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyPro}
            onChange={(e) => setOnlyPro(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Только Pro-продавцы</span>
        </label>

        {masterLocation && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Радиус:</span>
            <select
              value={radiusFilter || ''}
              onChange={(e) => setRadiusFilter(e.target.value ? Number(e.target.value) : null)}
              className="input text-sm h-8 px-2"
            >
              <option value="">Все</option>
              <option value="5">5 км</option>
              <option value="10">10 км</option>
              <option value="25">25 км</option>
              <option value="50">50 км</option>
              <option value="100">100 км</option>
            </select>
          </div>
        )}

        <div className="text-sm text-text-secondary ml-auto">
          Найдено: {sellers.length} {sellers.length === 1 ? 'магазин' : sellers.length < 5 ? 'магазина' : 'магазинов'}
        </div>
      </div>

      {/* Карта */}
      <div className="h-[600px] w-full rounded-lg overflow-hidden border border-border-light/60 relative">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-2"></div>
              <p className="text-sm text-text-secondary">Загрузка магазинов...</p>
            </div>
          </div>
        ) : typeof window !== 'undefined' ? (
          <MapContainer
            center={center}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            className="h-full w-full"
            whenCreated={(map: any) => {
              mapRef.current = map
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Круг радиуса мастера */}
            {masterLocation && radiusFilter && (
              <Circle
                center={[masterLocation.lat, masterLocation.lng]}
                radius={radiusFilter * 1000}
                pathOptions={{
                  color: '#C7362F',
                  fillColor: '#C7362F',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            )}

            {/* Маркеры продавцов */}
            {sellers.map((point) => {
              const isPro = point.seller.is_pro || 
                (point.seller.pro_until && new Date(point.seller.pro_until) > new Date())
              
              return (
                <Marker
                  key={point.seller.id}
                  position={[point.lat, point.lng]}
                  eventHandlers={{
                    click: () => handleMarkerClick(point.seller.id),
                  }}
                >
                  <Popup>
                    <div className="min-w-[280px] max-w-[320px]">
                      <div className="flex items-start gap-3 mb-3">
                        {point.seller.avatar_url ? (
                          <img
                            src={point.seller.avatar_url}
                            alt={point.seller.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <FiShoppingBag className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 truncate">
                            {point.seller.full_name}
                          </h3>
                          {(point.seller.store_address || point.seller.city) ? (
                            <p className="text-xs text-text-secondary flex items-center gap-1">
                              <FiMapPin size={12} />
                              {point.seller.store_address || point.seller.city}
                            </p>
                          ) : (
                            <p className="text-xs text-text-muted italic">
                              Адрес не указан
                            </p>
                          )}
                        </div>
                        {isPro && (
                          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                            PRO
                          </span>
                        )}
                      </div>

                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <p className="text-xs text-text-secondary mb-2">
                          Товаров в наличии: <span className="font-semibold">{point.productsCount}</span>
                        </p>

                        {loadingProducts[point.seller.id] ? (
                          <p className="text-xs text-text-secondary">Загрузка товаров...</p>
                        ) : sellerProducts[point.seller.id]?.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-text-secondary">Последние товары:</p>
                            {sellerProducts[point.seller.id].slice(0, 3).map((product) => (
                              <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                className="block p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {product.images && product.images.length > 0 ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                                      <FiShoppingBag size={16} className="text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{product.name}</p>
                                    <p className="text-xs text-brand-accent font-semibold">
                                      {product.price.toLocaleString('ru-RU')} ₽
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : null}

                        <Link
                          href={`/profile/${point.seller.id}`}
                          className="block mt-3 text-center text-sm text-brand-accent font-medium hover:underline"
                        >
                          Открыть профиль продавца
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        ) : null}
      </div>

      <div className="mt-3 text-xs text-text-muted text-center">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}
