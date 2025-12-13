'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/app/providers'
import { supabase, PortfolioItem, PortfolioLike, PortfolioComment, User } from '@/lib/supabase'
import { FiX, FiChevronLeft, FiChevronRight, FiHeart, FiMessageCircle, FiSend } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PortfolioGalleryProps {
  items: PortfolioItem[]
  initialIndex: number
  onClose: () => void
}

export default function PortfolioGallery({ items, initialIndex, onClose }: PortfolioGalleryProps) {
  const { user: currentUser } = useAuth()
  const [currentItemIndex, setCurrentItemIndex] = useState(initialIndex)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [comments, setComments] = useState<PortfolioComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [master, setMaster] = useState<User | null>(null)
  
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const swipeDirection = useRef<'vertical' | 'horizontal' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastWheelTime = useRef<number>(0)
  const lastItemChangeTime = useRef<number>(0)
  const commentsRef = useRef<HTMLDivElement>(null)

  const currentItem = items[currentItemIndex]
  
  // Объединяем все медиа (фото и видео) текущей работы в один массив
  const allMedia = currentItem
    ? [
        ...currentItem.images.map((url) => ({ type: 'image' as const, url })),
        ...currentItem.videos.map((url) => ({ type: 'video' as const, url })),
      ]
    : []

  // Загружаем данные для текущей работы
  useEffect(() => {
    if (currentItem) {
      setCurrentMediaIndex(0)
      fetchLikes()
      fetchComments()
      fetchMaster()
    }
  }, [currentItemIndex, currentItem])

  const fetchMaster = async () => {
    if (!currentItem?.master_id) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentItem.master_id)
        .single()

      if (error) throw error
      setMaster(data as User)
    } catch (error) {
      console.error('Error fetching master:', error)
    }
  }

  const fetchLikes = async () => {
    if (!currentItem || !currentUser) return
    try {
      // Проверяем, лайкнул ли текущий пользователь
      const { data: likeData } = await supabase
        .from('portfolio_likes')
        .select('id')
        .eq('portfolio_item_id', currentItem.id)
        .eq('user_id', currentUser.id)
        .single()

      setLiked(!!likeData)

      // Получаем количество лайков
      const { data: itemData } = await supabase
        .from('portfolio_items')
        .select('likes_count')
        .eq('id', currentItem.id)
        .single()

      setLikesCount(itemData?.likes_count || 0)
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }

  const fetchComments = async () => {
    if (!currentItem) return
    try {
      const { data, error } = await supabase
        .from('portfolio_comments')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, role)
        `)
        .eq('portfolio_item_id', currentItem.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments((data as PortfolioComment[]) || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleLike = async () => {
    if (!currentUser || !currentItem) return
    try {
      if (liked) {
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', currentItem.id)
          .eq('user_id', currentUser.id)

        if (error) throw error
        setLiked(false)
        setLikesCount((prev) => Math.max(0, prev - 1))
      } else {
        const { error } = await supabase
          .from('portfolio_likes')
          .insert({
            portfolio_item_id: currentItem.id,
            user_id: currentUser.id,
          })

        if (error) throw error
        setLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !currentItem || !commentText.trim()) return

    setSubmittingComment(true)
    try {
      const { error } = await supabase
        .from('portfolio_comments')
        .insert({
          portfolio_item_id: currentItem.id,
          user_id: currentUser.id,
          content: commentText.trim(),
        })

      if (error) throw error
      setCommentText('')
      await fetchComments()
      // Прокрутка к последнему комментарию
      setTimeout(() => {
        if (commentsRef.current) {
          commentsRef.current.scrollTop = commentsRef.current.scrollHeight
        }
      }, 100)
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Ошибка при отправке комментария')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handlePreviousItem = useCallback(() => {
    if (items.length <= 1) return
    
    const now = Date.now()
    if (now - lastItemChangeTime.current < 400) return
    lastItemChangeTime.current = now
    
    setSlideDirection('down')
    setShowComments(false)
    setCurrentItemIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
    setTimeout(() => setSlideDirection(null), 400)
  }, [items.length])

  const handleNextItem = useCallback(() => {
    if (items.length <= 1) return
    
    const now = Date.now()
    if (now - lastItemChangeTime.current < 400) return
    lastItemChangeTime.current = now
    
    setSlideDirection('up')
    setShowComments(false)
    setCurrentItemIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
    setTimeout(() => setSlideDirection(null), 400)
  }, [items.length])

  const handlePreviousMedia = useCallback(() => {
    if (allMedia.length <= 1) return
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : allMedia.length - 1))
  }, [allMedia.length])

  const handleNextMedia = useCallback(() => {
    if (allMedia.length <= 1) return
    setCurrentMediaIndex((prev) => (prev < allMedia.length - 1 ? prev + 1 : 0))
  }, [allMedia.length])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentItem) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePreviousMedia()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextMedia()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        handlePreviousItem()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleNextItem()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [currentItem, handlePreviousItem, handleNextItem, handlePreviousMedia, handleNextMedia, onClose])

  // Wheel handlers
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!currentItem || !containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) return
      
      const now = Date.now()
      if (now - lastWheelTime.current < 150) return
      lastWheelTime.current = now

      e.preventDefault()
      e.stopPropagation()

      const absDeltaY = Math.abs(e.deltaY)
      const absDeltaX = Math.abs(e.deltaX)
      
      if (absDeltaY > 15) {
        if (e.deltaY > 0) {
          handleNextItem()
        } else {
          handlePreviousItem()
        }
      } else if (absDeltaX > 20 && absDeltaY < 10) {
        if (e.deltaX > 0) {
          handleNextMedia()
        } else {
          handlePreviousMedia()
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [currentItem, handlePreviousItem, handleNextItem, handlePreviousMedia, handleNextMedia])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    swipeDirection.current = null
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return
    
    const touchY = e.touches[0].clientY
    const touchX = e.touches[0].clientX
    const deltaY = Math.abs(touchY - touchStartY.current)
    const deltaX = Math.abs(touchX - touchStartX.current)

    if (swipeDirection.current === null) {
      if (deltaY > deltaX && deltaY > 10) {
        swipeDirection.current = 'vertical'
      } else if (deltaX > deltaY && deltaX > 10) {
        swipeDirection.current = 'horizontal'
      }
    }

    if (swipeDirection.current === 'vertical' && deltaY > 5) {
      e.preventDefault()
      e.stopPropagation()
    } else if (swipeDirection.current === 'horizontal' && deltaX > 5) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return

    const touchY = e.changedTouches[0].clientY
    const touchX = e.changedTouches[0].clientX
    const deltaY = touchY - touchStartY.current
    const deltaX = touchX - touchStartX.current
    const absDeltaY = Math.abs(deltaY)
    const absDeltaX = Math.abs(deltaX)
    const threshold = 50

    if (swipeDirection.current === 'vertical' && absDeltaY > threshold) {
      if (deltaY > 0) {
        handleNextItem()
      } else {
        handlePreviousItem()
      }
    } else if (swipeDirection.current === 'horizontal' && absDeltaX > threshold) {
      if (deltaX > 0) {
        handlePreviousMedia()
      } else {
        handleNextMedia()
      }
    }

    touchStartY.current = null
    touchStartX.current = null
    swipeDirection.current = null
  }, [handleNextItem, handlePreviousItem, handleNextMedia, handlePreviousMedia])

  if (!currentItem || allMedia.length === 0) return null

  const currentMedia = allMedia[currentMediaIndex]

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Top Header - Минималистичный */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 p-3 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            {master && (
              <div className="w-8 h-8 bg-white border border-gray-200 flex items-center justify-center text-black text-sm font-bold">
                {master.avatar_url ? (
                  <img src={master.avatar_url} alt={master.full_name} className="w-full h-full object-cover" />
                ) : (
                  master.full_name[0]?.toUpperCase() || '?'
                )}
              </div>
            )}
            <div>
              {master && (
                <p className="text-sm font-semibold text-white">{master.full_name}</p>
              )}
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true, locale: ru })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 transition-colors rounded-full pointer-events-auto"
          >
            <FiX size={20} className="text-white" />
          </button>
        </div>
        {/* Индикатор текущей работы */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1 mt-2 pointer-events-none">
            {items.map((_, index) => (
              <div
                key={index}
                className={`h-0.5 flex-1 transition-all ${
                  index === currentItemIndex
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Content - Медиа */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden mt-14">
        <div 
          key={`item-${currentItemIndex}-media-${currentMediaIndex}`}
          className={`w-full h-full flex items-center justify-center ${
            slideDirection === 'up' 
              ? 'animate-slide-out-up' 
              : slideDirection === 'down' 
              ? 'animate-slide-out-down' 
              : ''
          }`}
        >
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={currentItem.title}
              className="w-full h-full object-contain select-none pointer-events-none"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <video
              src={currentMedia.url}
              controls
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onDragStart={(e) => e.preventDefault()}
            />
          )}
        </div>

        {/* Горизонтальные кнопки навигации между медиа */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={handlePreviousMedia}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 transition-colors z-20 rounded-full backdrop-blur-sm pointer-events-auto"
            >
              <FiChevronLeft size={20} className="text-white" />
            </button>
            <button
              onClick={handleNextMedia}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 transition-colors z-20 rounded-full backdrop-blur-sm pointer-events-auto"
            >
              <FiChevronRight size={20} className="text-white" />
            </button>
          </>
        )}

        {/* Индикатор медиа внутри работы */}
        {allMedia.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none z-30">
            {allMedia.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-8 transition-all ${
                  index === currentMediaIndex
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section - Instagram Style */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-sm border-t border-white/10 transition-all duration-300 ${
          showComments ? 'h-2/3' : 'h-auto'
        }`}
      >
        {/* Кнопки действий */}
        <div className="flex items-center gap-4 p-4 border-b border-white/10 pointer-events-auto">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition-colors ${
              liked ? 'text-red-500' : 'text-white hover:text-red-500'
            }`}
          >
            <FiHeart size={24} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <FiMessageCircle size={24} />
          </button>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-white">
            {likesCount > 0 && `${likesCount} ${likesCount === 1 ? 'лайк' : likesCount < 5 ? 'лайка' : 'лайков'}`}
          </span>
        </div>

        {/* Описание работы */}
        {currentItem.description && (
          <div 
            key={`desc-${currentItemIndex}`}
            className={`px-4 py-3 border-b border-white/10 ${
              slideDirection === 'up' 
                ? 'animate-slide-in-up' 
                : slideDirection === 'down' 
                ? 'animate-slide-in-down' 
                : ''
            }`}
          >
            <p className="text-sm text-white leading-relaxed">
              <span className="font-semibold">{master?.full_name || 'Мастер'}</span>{' '}
              {currentItem.description}
            </p>
          </div>
        )}

        {/* Комментарии */}
        {showComments && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div 
              ref={commentsRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Пока нет комментариев
                </p>
              ) : (
                comments.map((comment) => {
                  const commentUser = comment.user as User | undefined
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-white border border-gray-200 flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                        {commentUser?.avatar_url ? (
                          <img 
                            src={commentUser.avatar_url} 
                            alt={commentUser.full_name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          commentUser?.full_name[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className="font-semibold">{commentUser?.full_name || 'Пользователь'}</span>{' '}
                          {comment.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Форма комментария */}
            {currentUser && (
              <form onSubmit={handleSubmitComment} className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Добавить комментарий..."
                    className="flex-1 bg-white/10 border border-white/20 rounded px-4 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-white/40"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="p-2 text-white hover:text-gray-300 transition-colors disabled:opacity-40"
                  >
                    <FiSend size={20} />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
