'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/app/providers'
import { supabase, PortfolioItem, PortfolioLike, PortfolioComment, User } from '@/lib/supabase'
import { FiX, FiChevronLeft, FiChevronRight, FiHeart, FiMessageCircle, FiSend } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface PortfolioGalleryProps {
  items: PortfolioItem[]
  initialIndex: number
  onClose: () => void
  initialCommentId?: string
  focusCommentInput?: boolean
}

type TreeComment = PortfolioComment & { user?: User; replies?: TreeComment[] }

const INITIAL_REPLIES_VISIBLE = 10

function collectDescendants(c: TreeComment): TreeComment[] {
  if (!c.replies?.length) return []
  return c.replies.flatMap((r) => [r, ...collectDescendants(r)])
}

function pluralReplies(x: number) {
  return x === 1 ? 'ответ' : x >= 2 && x <= 4 ? 'ответа' : 'ответов'
}

function buildTree(flat: (PortfolioComment & { user?: User })[]): TreeComment[] {
  const roots = flat.filter((c) => !c.parent_comment_id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  function attach(nodes: (PortfolioComment & { user?: User })[]): TreeComment[] {
    return nodes.map((n) => {
      const kids = flat.filter((c) => c.parent_comment_id === n.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return { ...n, replies: attach(kids) }
    })
  }
  return attach(roots)
}

export default function PortfolioGallery({ items, initialIndex, onClose, initialCommentId, focusCommentInput }: PortfolioGalleryProps) {
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
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({})
  const [master, setMaster] = useState<User | null>(null)
  
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const swipeDirection = useRef<'vertical' | 'horizontal' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastWheelTime = useRef<number>(0)
  const lastItemChangeTime = useRef<number>(0)
  const commentsRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const touchStartedInCommentsRef = useRef(false)

  const currentItem = items[currentItemIndex]

  useEffect(() => {
    if (initialCommentId || focusCommentInput) setShowComments(true)
  }, [initialCommentId, focusCommentInput])

  useEffect(() => {
    if (!initialCommentId || comments.length === 0) return
    const el = document.getElementById(`comment-${initialCommentId}`)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
  }, [initialCommentId, comments])

  useEffect(() => {
    if (!focusCommentInput || !showComments) return
    const t = setTimeout(() => commentInputRef.current?.focus(), 400)
    return () => clearTimeout(t)
  }, [focusCommentInput, showComments])
  
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
        .maybeSingle()

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
          parent_comment_id: replyingTo?.id || null,
        })

      if (error) throw error
      setCommentText('')
      setReplyingTo(null)
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

  const handleReplyTo = (commentId: string, authorName: string) => {
    setReplyingTo({ id: commentId, authorName })
    setCommentText(`@${authorName} `)
    setTimeout(() => commentInputRef.current?.focus(), 80)
  }

  const handlePreviousItem = useCallback(() => {
    if (items.length <= 1) return
    
    const now = Date.now()
    if (now - lastItemChangeTime.current < 250) return
    lastItemChangeTime.current = now
    
    setSlideDirection('down')
    setShowComments(false)
    setReplyingTo(null)
    setCurrentItemIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
    setTimeout(() => setSlideDirection(null), 300)
  }, [items.length])

  const handleNextItem = useCallback(() => {
    if (items.length <= 1) return
    
    const now = Date.now()
    if (now - lastItemChangeTime.current < 250) return
    lastItemChangeTime.current = now
    
    setSlideDirection('up')
    setShowComments(false)
    setCurrentItemIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
    setTimeout(() => setSlideDirection(null), 300)
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

  // Wheel handlers - улучшенная прокрутка как в Instagram
  useEffect(() => {
    let accumulatedDeltaY = 0
    let wheelTimeout: NodeJS.Timeout | null = null

    const handleWheel = (e: WheelEvent) => {
      if (!currentItem || !containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) return
      if (commentsRef.current && commentsRef.current.contains(e.target as Node)) return

      e.preventDefault()
      e.stopPropagation()

      const absDeltaY = Math.abs(e.deltaY)
      const absDeltaX = Math.abs(e.deltaX)
      
      // Вертикальная прокрутка - переключение между работами
      if (absDeltaY > absDeltaX && absDeltaY > 5) {
        accumulatedDeltaY += e.deltaY
        
        // Сбрасываем накопление через небольшую задержку
        if (wheelTimeout) {
          clearTimeout(wheelTimeout)
        }
        wheelTimeout = setTimeout(() => {
          accumulatedDeltaY = 0
        }, 100)

        // Порог для переключения работы (более чувствительный)
        const threshold = 50
        
        if (Math.abs(accumulatedDeltaY) >= threshold) {
          const now = Date.now()
          if (now - lastWheelTime.current < 300) return
          lastWheelTime.current = now

          if (accumulatedDeltaY > 0) {
          handleNextItem()
        } else {
          handlePreviousItem()
        }
          accumulatedDeltaY = 0
        }
      } 
      // Горизонтальная прокрутка - переключение между медиа внутри работы
      else if (absDeltaX > absDeltaY && absDeltaX > 10) {
        const now = Date.now()
        if (now - lastWheelTime.current < 200) return
        lastWheelTime.current = now

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
      if (wheelTimeout) {
        clearTimeout(wheelTimeout)
      }
    }
  }, [currentItem, handlePreviousItem, handleNextItem, handlePreviousMedia, handleNextMedia])

  // Touch handlers - улучшенные для плавной прокрутки как в Instagram
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartedInCommentsRef.current = !!(commentsRef.current && commentsRef.current.contains(e.target as Node))
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    swipeDirection.current = null
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartedInCommentsRef.current) return
    if (touchStartY.current === null || touchStartX.current === null) return
    
    const touchY = e.touches[0].clientY
    const touchX = e.touches[0].clientX
    const deltaY = Math.abs(touchY - touchStartY.current)
    const deltaX = Math.abs(touchX - touchStartX.current)

    // Определяем направление свайпа быстрее и точнее
    if (swipeDirection.current === null) {
      if (deltaY > deltaX && deltaY > 8) {
        swipeDirection.current = 'vertical'
      } else if (deltaX > deltaY && deltaX > 8) {
        swipeDirection.current = 'horizontal'
      }
    }

    // Блокируем прокрутку страницы при свайпе
    if (swipeDirection.current === 'vertical' && deltaY > 3) {
      e.preventDefault()
      e.stopPropagation()
    } else if (swipeDirection.current === 'horizontal' && deltaX > 3) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return
    if (touchStartedInCommentsRef.current) {
      touchStartY.current = null
      touchStartX.current = null
      swipeDirection.current = null
      return
    }

    const touchY = e.changedTouches[0].clientY
    const touchX = e.changedTouches[0].clientX
    const deltaY = touchY - touchStartY.current
    const deltaX = touchX - touchStartX.current
    const absDeltaY = Math.abs(deltaY)
    const absDeltaX = Math.abs(deltaX)
    
    // Сниженный порог для более чувствительной прокрутки
    const verticalThreshold = 40
    const horizontalThreshold = 40

    if (swipeDirection.current === 'vertical' && absDeltaY > verticalThreshold) {
      const now = Date.now()
      if (now - lastItemChangeTime.current < 300) {
        touchStartY.current = null
        touchStartX.current = null
        swipeDirection.current = null
        return
      }
      lastItemChangeTime.current = now

      if (deltaY > 0) {
        handleNextItem()
      } else {
        handlePreviousItem()
      }
    } else if (swipeDirection.current === 'horizontal' && absDeltaX > horizontalThreshold) {
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

  const tree = buildTree(comments)
  const firstTwoComments = tree.slice(0, 2)

  const CommentBlock = ({ comment, level = 0, isFlatReply = false }: { comment: TreeComment; level?: number; isFlatReply?: boolean }) => {
    const commentUser = comment.user as User | undefined
    const name = commentUser?.full_name || 'Пользователь'
    return (
      <div id={`comment-${comment.id}`} className={`flex gap-3 ${level > 0 ? 'ml-6 mt-2 border-l-2 border-gray-200 pl-3' : ''}`}>
        <div className="w-8 h-8 bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 text-xs font-bold flex-shrink-0 rounded-full overflow-hidden relative">
          {commentUser?.avatar_url ? (
            <Image src={commentUser.avatar_url} alt={name} fill className="object-cover rounded-full" sizes="32px" />
          ) : (
            (name[0]?.toUpperCase() || '?')
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-semibold">{name}</span> {comment.content}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
            </p>
            {currentUser && (
              <button
                type="button"
                onClick={() => handleReplyTo(comment.id, name)}
                className="text-xs text-gray-500 hover:text-brand-accent transition-colors flex items-center gap-1"
              >
                <FiMessageCircle size={10} />
                Ответить
              </button>
            )}
          </div>
          {!isFlatReply &&
          (() => {
            const flatReplies = collectDescendants(comment).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            const n = flatReplies.length
            if (n === 0) return null
            const isExpanded = !!expandedReplies[comment.id]
            const toShow = showAllReplies[comment.id] ? flatReplies : flatReplies.slice(0, INITIAL_REPLIES_VISIBLE)
            const moreCount = n - INITIAL_REPLIES_VISIBLE
            return (
              <div className="mt-3">
                {!isExpanded ? (
                  <button
                    type="button"
                    onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: true }))}
                    className="text-xs text-gray-500 hover:text-brand-accent transition-colors"
                  >
                    Показать {n} {pluralReplies(n)}
                  </button>
                ) : (
                  <>
                    {toShow.map((r) => (
                      <CommentBlock key={r.id} comment={r} level={1} isFlatReply />
                    ))}
                    {moreCount > 0 && !showAllReplies[comment.id] && (
                      <button
                        type="button"
                        onClick={() => setShowAllReplies((prev: Record<string, boolean>) => ({ ...prev, [comment.id]: true }))}
                        className="text-xs text-gray-500 hover:text-brand-accent transition-colors mt-1"
                      >
                        Посмотреть ещё {moreCount} {pluralReplies(moreCount)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: false }))}
                      className="text-xs text-gray-500 hover:text-brand-accent transition-colors mt-2"
                    >
                      Скрыть ответы
                    </button>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gradient-to-br from-bg-primary to-bg-secondary flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Top Header - Глянцевый */}
      <div className="absolute top-0 left-0 right-0 z-40 glass-strong border-b border-white/30 p-3 pointer-events-none shadow-glass">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            {master && (
              <div className="w-8 h-8 bg-gradient-to-br from-graphite-primary to-graphite-tertiary border-2 border-white/50 flex items-center justify-center text-white text-sm font-bold rounded-full shadow-glossy overflow-hidden relative">
                {master.avatar_url ? (
                  <>
                    <Image src={master.avatar_url} alt={master.full_name} fill className="object-cover rounded-full" sizes="32px" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-60"></div>
                  </>
                ) : (
                  master.full_name[0]?.toUpperCase() || '?'
                )}
              </div>
            )}
            <div>
              {master && (
                <p className="text-sm font-semibold text-gray-900">{master.full_name}</p>
              )}
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true, locale: ru })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 transition-all rounded-full pointer-events-auto backdrop-blur-sm border border-white/20"
          >
            <FiX size={20} className="text-graphite-secondary" />
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
                    ? 'bg-gray-900'
                    : 'bg-gray-300'
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
            <div className="relative w-full h-full">
              <Image
                src={currentMedia.url}
                alt={currentItem.title}
                fill
                className="object-contain select-none pointer-events-none"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                sizes="100vw"
                priority={currentMediaIndex === 0 && currentItemIndex === initialIndex}
              />
            </div>
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
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 glass hover:bg-white/90 transition-all z-20 rounded-full backdrop-blur-md pointer-events-auto border border-white/30 shadow-glossy hover:scale-110"
            >
              <FiChevronLeft size={20} className="text-graphite-secondary" />
            </button>
            <button
              onClick={handleNextMedia}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 glass hover:bg-white/90 transition-all z-20 rounded-full backdrop-blur-md pointer-events-auto border border-white/30 shadow-glossy hover:scale-110"
            >
              <FiChevronRight size={20} className="text-graphite-secondary" />
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
                    ? 'bg-gray-900'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section - Глянцевый фон */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-40 glass-strong border-t border-white/30 transition-all duration-300 shadow-glass ${
          showComments ? 'h-2/3 flex flex-col min-h-0' : 'h-auto'
        }`}
      >
        {/* Кнопки действий */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 pointer-events-auto flex-shrink-0">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition-all hover:scale-110 ${
              liked ? 'text-brand-accent' : 'text-graphite-secondary hover:text-brand-accent'
            }`}
          >
            <FiHeart size={24} fill={liked ? 'currentColor' : 'none'} className={liked ? 'drop-shadow-glow' : ''} />
          </button>
          <button
            onClick={() => {
              const next = !showComments
              setShowComments(next)
              if (!next) setReplyingTo(null)
            }}
            className="flex items-center gap-2 text-graphite-secondary hover:text-brand-accent transition-all hover:scale-110"
          >
            <FiMessageCircle size={24} />
          </button>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-gray-900">
            {likesCount > 0 && `${likesCount} ${likesCount === 1 ? 'лайк' : likesCount < 5 ? 'лайка' : 'лайков'}`}
          </span>
        </div>

        {/* Описание работы */}
        {currentItem.description && (
          <div 
            key={`desc-${currentItemIndex}`}
            className={`px-4 py-3 border-b border-gray-200 flex-shrink-0 ${
              slideDirection === 'up' 
                ? 'animate-slide-in-up' 
                : slideDirection === 'down' 
                ? 'animate-slide-in-down' 
                : ''
            }`}
          >
            <p className="text-sm text-gray-900 leading-relaxed">
              <span className="font-semibold">{master?.full_name || 'Мастер'}</span>{' '}
              {currentItem.description}
            </p>
          </div>
        )}

        {/* Первые 2 комментария - всегда видны */}
        {firstTwoComments.length > 0 && !showComments && (
          <div className="px-4 py-3 space-y-3 border-b border-gray-200">
            {firstTwoComments.map((comment) => {
              const commentUser = comment.user as User | undefined
              return (
                <div key={comment.id} className="flex gap-3">
                  <div className="relative w-8 h-8 bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 text-xs font-bold flex-shrink-0 rounded-full overflow-hidden">
                    {commentUser?.avatar_url ? (
                      <Image 
                        src={commentUser.avatar_url} 
                        alt={commentUser.full_name} 
                        fill
                        className="object-cover rounded-full" 
                        sizes="32px"
                      />
                    ) : (
                      commentUser?.full_name[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{commentUser?.full_name || 'Пользователь'}</span>{' '}
                      {comment.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                </div>
              )
            })}
            {comments.length > 2 && (
              <button
                onClick={() => setShowComments(true)}
                className="text-sm text-gray-500 hover:text-gray-700 mt-2"
              >
                Показать все комментарии ({comments.length})
              </button>
            )}
          </div>
        )}

        {/* Все комментарии - при нажатии на иконку */}
        {showComments && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div 
              ref={commentsRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3 touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Пока нет комментариев
                </p>
              ) : (
                tree.map((c) => <CommentBlock key={c.id} comment={c} level={0} />)
              )}
            </div>

            {/* Форма комментария — всегда внизу, не скроллится */}
            {currentUser && (
              <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-200 flex-shrink-0">
                {replyingTo && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">Ответ для {replyingTo.authorName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null)
                        const a = commentText.replace(/^@[^\s]+\s?/, '')
                        setCommentText(a)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Отмена
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={replyingTo ? `Ответ для ${replyingTo.authorName}...` : 'Добавить комментарий...'}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded px-4 py-2 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="p-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-40"
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
