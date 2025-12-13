'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, PortfolioItem } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiSearch } from 'react-icons/fi'

type RoleFilter = 'all' | 'master' | 'seller'

export default function PublicationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [mode, setMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchItems()
    }
  }, [user, roleFilter])

  const fetchItems = async () => {
    try {
      let query = supabase
        .from('portfolio_items')
        .select(`
          *,
          master:profiles(id, full_name, avatar_url, role, city)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (roleFilter === 'master') {
        query = query.eq('master.role', 'master')
      } else if (roleFilter === 'seller') {
        query = query.eq('master.role', 'seller')
      }

      const { data, error } = await query
      if (error) throw error
      setItems((data as PortfolioItem[]) || [])
    } catch (error) {
      console.error('Error fetching portfolio items:', error)
    } finally {
      setLoading(false)
    }
  }

  const gridItems = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      title: item.title || 'Работа',
      thumb: item.images && item.images.length > 0 ? item.images[0] : item.videos?.[0] || null,
      item,
    }))
  }, [items])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold">Публикации работ</h1>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setMode('grid')}
                className={`px-3 py-1 text-sm border ${mode === 'grid' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                Сетка
              </button>
              <button
                onClick={() => setMode('list')}
                className={`px-3 py-1 text-sm border ${mode === 'list' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                Лента
              </button>
              <button
                onClick={() => router.push('/search')}
                className="p-2 border border-gray-200 rounded hover:bg-gray-50"
                title="Глобальный поиск"
              >
                <FiSearch size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 text-sm border ${roleFilter === 'all' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              Все
            </button>
            <button
              onClick={() => setRoleFilter('master')}
              className={`px-3 py-1 text-sm border ${roleFilter === 'master' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              Мастера
            </button>
            <button
              onClick={() => setRoleFilter('seller')}
              className={`px-3 py-1 text-sm border ${roleFilter === 'seller' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              Продавцы
            </button>
            <div className="ml-auto">
              <button
                onClick={() => router.push('/search')}
                className="p-2 border border-gray-200 rounded hover:bg-gray-50"
                title="Глобальный поиск"
              >
                <FiSearch size={18} />
              </button>
            </div>
          </div>

          {mode === 'grid' ? (
            <div className="grid grid-cols-3 gap-1">
              {gridItems.length === 0 ? (
                <div className="col-span-3 card text-center text-gray-500 py-12">
                  Публикаций нет
                </div>
              ) : (
                gridItems.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setMode('list')}
                    className="aspect-square bg-gray-100 cursor-pointer overflow-hidden relative group"
                    title="Открыть ленту"
                  >
                    {item.thumb ? (
                      <img
                        src={item.thumb}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm px-2 text-center">
                        {item.title}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs px-2 py-1 line-clamp-2">
                      {item.title}
                      {item.item.description && (
                        <div className="text-[11px] text-gray-200 line-clamp-1">{item.item.description}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {items.length === 0 ? (
                <div className="card text-center text-gray-500 py-12 animate-fade-in">
                  <div className="text-5xl mb-3">📝</div>
                  <p className="text-base font-medium">Пока нет публикаций.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-sm font-bold">
                        {item.master?.avatar_url ? (
                          <img src={item.master.avatar_url} alt={item.master.full_name} className="w-full h-full object-cover" />
                        ) : (
                          item.master?.full_name?.[0]?.toUpperCase() || 'M'
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-black">{item.master?.full_name || 'Мастер'}</div>
                        <div className="text-xs text-gray-500">{item.master?.city}</div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="font-semibold text-base text-black">{item.title}</div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-3">{item.description}</p>
                      )}
                    </div>
                    {item.images && item.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {item.images.slice(0, 3).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={item.title}
                            className="w-full h-32 object-cover border border-gray-200"
                          />
                        ))}
                      </div>
                    ) : item.videos && item.videos.length > 0 ? (
                      <div className="mt-3">
                        <video src={item.videos[0]} controls className="w-full rounded border border-gray-200" />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

