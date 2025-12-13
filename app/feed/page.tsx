'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, PortfolioItem } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiGlobe } from 'react-icons/fi'

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchItems()
    }
  }, [user])

  const fetchItems = async () => {
    try {
      const { data: subs, error: subsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id)
      if (subsError) throw subsError
      const followingIds = subs?.map((s) => s.following_id) || []

      if (followingIds.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      let query = supabase
        .from('portfolio_items')
        .select(`
          *,
          master:profiles(id, full_name, avatar_url, role, city)
        `)
        .in('master_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(100)

      const { data, error } = await query
      if (error) throw error
      setItems((data as PortfolioItem[]) || [])
    } catch (error) {
      console.error('Error fetching portfolio items:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => router.push('/feed/publications')}
              className="p-2 border border-gray-200 rounded hover:bg-gray-50"
              title="Все работы"
            >
              <FiGlobe size={18} />
            </button>
          </div>

          <div className="space-y-6 mt-4">
            {items.length === 0 ? (
              <div className="card text-center text-gray-500 py-12 animate-fade-in">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-lg font-medium">Пока нет работ от ваших подписок.</p>
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
        </div>
      </div>
    </div>
  )
}

