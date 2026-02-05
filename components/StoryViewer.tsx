'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Story, User } from '@/lib/supabase'
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface StoryViewerProps {
  stories: { user: User; stories: Story[] }[]
  initialIndex: number
  currentUserId?: string
  onClose: () => void
}

export default function StoryViewer({
  stories,
  initialIndex,
  currentUserId,
  onClose,
}: StoryViewerProps) {
  const router = useRouter()
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0) // Индекс истории внутри историй пользователя
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  const currentUserStories = stories[currentUserIndex]
  // Сортируем истории пользователя по дате (от новых к старым, как в Instagram - самая свежая первая)
  const sortedStories = currentUserStories?.stories
    ? [...currentUserStories.stories].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : []
  const currentStory = sortedStories[currentStoryIndex]
  const currentMedia = currentStory?.media[currentMediaIndex]

  // Сбрасываем индекс истории при смене пользователя
  useEffect(() => {
    setCurrentStoryIndex(0)
    setCurrentMediaIndex(0)
  }, [currentUserIndex])

  // Отмечаем историю как просмотренную
  useEffect(() => {
    if (currentStory && currentUserId && !currentStory.viewed_by_user) {
      fetch(`/api/stories/${currentStory.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: currentUserId }),
      }).catch(console.error)
    }
  }, [currentStory?.id, currentUserId])

  // Автопрокрутка медиа
  useEffect(() => {
    if (!currentStory || !isPlaying) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      return
    }

    const isVideo = currentStory.media_type === 'video'
    
    // Для видео используем событие ended (только если это видео)
    if (isVideo && videoRef.current) {
      const handleVideoEnd = () => {
        goToNextMedia()
      }
      videoRef.current.addEventListener('ended', handleVideoEnd)
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('ended', handleVideoEnd)
        }
      }
    }

    // Для фото используем интервал (5 секунд на фото)
    const photoDuration = 5000
    progressIntervalRef.current = setInterval(() => {
      goToNextMedia()
    }, photoDuration)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMediaIndex, currentStoryIndex, currentStory, isPlaying])

  const goToNextMedia = () => {
    if (!currentStory) return

    // Если есть еще медиа в текущей истории
    if (currentMediaIndex < currentStory.media.length - 1) {
      // Переходим к следующему медиа в текущей истории
      setCurrentMediaIndex(currentMediaIndex + 1)
    } else {
      // Это последнее медиа в истории - переходим к следующей истории того же пользователя
      goToNextStoryOfUser()
    }
  }

  const goToPreviousMedia = () => {
    if (!currentStory) return

    // Если есть предыдущее медиа в текущей истории
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1)
    } else {
      // Это первое медиа в истории - переходим к предыдущей истории того же пользователя
      goToPreviousStoryOfUser()
    }
  }

  // Переход к следующей истории того же пользователя
  const goToNextStoryOfUser = () => {
    if (!currentUserStories) return

    // Если есть еще истории у этого пользователя
    if (currentStoryIndex < sortedStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1)
      setCurrentMediaIndex(0)
    } else {
      // Все истории пользователя просмотрены - переходим к следующему пользователю
      goToNextUser()
    }
  }

  // Переход к предыдущей истории того же пользователя
  const goToPreviousStoryOfUser = () => {
    if (!currentUserStories) return

    // Если есть предыдущие истории у этого пользователя
    if (currentStoryIndex > 0) {
      const prevStory = sortedStories[currentStoryIndex - 1]
      setCurrentStoryIndex(currentStoryIndex - 1)
      setCurrentMediaIndex(prevStory.media.length - 1) // Переходим к последнему медиа предыдущей истории
    } else {
      // Это первая история пользователя - переходим к предыдущему пользователю
      goToPreviousUser()
    }
  }

  // Переход к следующему пользователю
  const goToNextUser = () => {
    if (currentUserIndex < stories.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1)
      setCurrentStoryIndex(0)
      setCurrentMediaIndex(0)
    } else {
      // Закрываем просмотр, если это последний пользователь
      onClose()
    }
  }

  // Переход к предыдущему пользователю
  const goToPreviousUser = () => {
    if (currentUserIndex > 0) {
      const prevUserStories = stories[currentUserIndex - 1]
      const prevUserSortedStories = prevUserStories.stories
        ? [...prevUserStories.stories].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        : []
      setCurrentUserIndex(currentUserIndex - 1)
      setCurrentStoryIndex(prevUserSortedStories.length - 1) // Переходим к последней истории предыдущего пользователя
      const lastStory = prevUserSortedStories[prevUserSortedStories.length - 1]
      setCurrentMediaIndex(lastStory ? lastStory.media.length - 1 : 0) // Переходим к последнему медиа
    }
  }

  // Свайп на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Свайп влево - следующее
        goToNextMedia()
      } else {
        // Свайп вправо - предыдущее
        goToPreviousMedia()
      }
    }
  }

  if (!currentUserStories || !currentStory || !currentMedia) {
    return null
  }

  // Проверяем, является ли текущее медиа видео
  const isVideo = currentStory.media_type === 'video'

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // Клик по левой части - предыдущее, по правой - следующее
        const clickX = e.clientX
        const screenWidth = window.innerWidth
        if (clickX < screenWidth / 2) {
          goToPreviousMedia()
        } else {
          goToNextMedia()
        }
      }}
    >
      {/* Прогресс-бары для всех историй пользователя (как в Instagram) */}
      {sortedStories.length > 0 && (
        <div className="absolute top-16 left-4 right-4 flex gap-1 z-10">
          {sortedStories.map((story, storyIdx) => {
            return story.media.map((_, mediaIdx) => {
              // Вычисляем глобальный индекс медиа (все медиа всех историй подряд)
              const globalIndex = sortedStories
                .slice(0, storyIdx)
                .reduce((sum, s) => sum + s.media.length, 0) + mediaIdx
              
              const currentGlobalIndex = sortedStories
                .slice(0, currentStoryIndex)
                .reduce((sum, s) => sum + s.media.length, 0) + currentMediaIndex
              
              const isActive = storyIdx === currentStoryIndex && mediaIdx === currentMediaIndex
              const isViewed = globalIndex < currentGlobalIndex
              
              return (
                <div
                  key={`${storyIdx}-${mediaIdx}`}
                  className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full ${
                      isViewed
                        ? 'bg-white w-full'
                        : isActive
                        ? 'bg-white/70'
                        : 'bg-transparent w-0'
                    }`}
                    style={isActive ? {
                      width: '0%',
                      animation: 'storyProgress 5s linear forwards'
                    } : isViewed ? {
                      width: '100%'
                    } : {
                      width: '0%'
                    }}
                  />
                </div>
              )
            })
          })}
        </div>
      )}

      {/* Информация о пользователе */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
            {currentUserStories.user.avatar_url ? (
              <img
                src={currentUserStories.user.avatar_url}
                alt={currentUserStories.user.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white font-semibold">
                {currentUserStories.user.full_name[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
                router.push(`/profile/${currentUserStories.user.id}`)
              }}
              className="text-white font-semibold hover:underline transition-colors text-left"
            >
              {currentUserStories.user.full_name}
            </button>
            <div className="text-white/70 text-xs">
              {new Date(currentStory.created_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          <FiX size={24} />
        </button>
      </div>

      {/* Описание истории (если есть) */}
      {currentStory.description && (
        <div className="absolute bottom-20 left-4 right-4 z-10">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 max-w-md">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {currentStory.description}
            </p>
          </div>
        </div>
      )}

      {/* Медиа контент */}
      <div className="w-full h-full flex items-center justify-center">
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentMedia}
            className="max-w-full max-h-full object-contain"
            autoPlay
            playsInline
            onEnded={goToNextMedia}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="relative w-full h-full min-h-[200px]">
            <Image
              src={currentMedia}
              alt="Story"
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized={!String(currentMedia).includes('supabase')}
            />
          </div>
        )}
      </div>

      {/* Навигационные кнопки (для десктопа) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          goToPreviousMedia()
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-colors hidden md:block"
      >
        <FiChevronLeft size={32} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          goToNextMedia()
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-colors hidden md:block"
      >
        <FiChevronRight size={32} />
      </button>
    </div>
  )
}
