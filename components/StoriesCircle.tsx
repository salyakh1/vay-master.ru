'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Story, User } from '@/lib/supabase'
import { FiPlus } from 'react-icons/fi'

// Dynamic imports для просмотра и создания историй - загружаются только при открытии
const StoryViewer = dynamic(() => import('./StoryViewer'), {
  ssr: false,
})

const CreateStory = dynamic(() => import('./CreateStory'), {
  ssr: false,
})

interface StoriesCircleProps {
  stories: Story[]
  currentUser?: User | null
  isOwnProfile?: boolean // Для отображения кнопки создания истории
  onStoryCreated?: () => void
}

export default function StoriesCircle({
  stories,
  currentUser,
  isOwnProfile = false,
  onStoryCreated,
}: StoriesCircleProps) {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null)
  const [showCreateStory, setShowCreateStory] = useState(false)

  // Группируем истории по пользователям
  const storiesByUser = new Map<string, { user: User; stories: Story[] }>()
  
  stories.forEach((story) => {
    if (story.user) {
      if (!storiesByUser.has(story.user.id)) {
        storiesByUser.set(story.user.id, {
          user: story.user,
          stories: [],
        })
      }
      storiesByUser.get(story.user.id)!.stories.push(story)
    }
  })

  const storiesArray = Array.from(storiesByUser.values())

  const handleStoryClick = (index: number) => {
    setSelectedStoryIndex(index)
  }

  const handleCloseViewer = () => {
    setSelectedStoryIndex(null)
  }

  const handleCreateStory = () => {
    setShowCreateStory(true)
  }

  const handleStoryCreated = () => {
    setShowCreateStory(false)
    if (onStoryCreated) {
      onStoryCreated()
    }
  }

  if (storiesArray.length === 0 && !isOwnProfile) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Кнопка создания истории (только для своего профиля) */}
        {isOwnProfile && (
          <button
            onClick={handleCreateStory}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-border-light flex items-center justify-center bg-bg-secondary hover:bg-bg-secondary/80 transition-colors">
              <FiPlus size={24} className="text-text-secondary" />
            </div>
            <span className="text-xs text-text-secondary">Создать</span>
          </button>
        )}

        {/* Кружочки историй */}
        {storiesArray.map((item, index) => {
          const hasUnviewed = item.stories.some(s => !s.viewed_by_user)
          const user = item.user
          
          // Берем самую свежую историю для превью
          const latestStory = item.stories
            ? [...item.stories].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
            : null
          
          // Берем первое фото/видео из истории для превью
          const previewMedia = latestStory?.media?.[0] || null

          return (
            <button
              key={user.id}
              onClick={() => handleStoryClick(index)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                {/* Кружочек с превью из истории или аватаром */}
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    hasUnviewed
                      ? 'bg-gradient-to-r from-brand-accent to-brand-accent-hover'
                      : 'bg-border-light'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary">
                    {previewMedia ? (
                      <img
                        src={previewMedia}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white font-semibold">
                        {user.full_name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
                {/* Индикатор новых историй */}
                {hasUnviewed && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent rounded-full border-2 border-bg-primary"></div>
                )}
              </div>
              <span className="text-xs text-text-secondary truncate max-w-[64px]">
                {user.full_name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Полноэкранный просмотр историй */}
      {selectedStoryIndex !== null && (
        <StoryViewer
          stories={storiesArray}
          initialIndex={selectedStoryIndex}
          currentUserId={currentUser?.id}
          onClose={handleCloseViewer}
        />
      )}

      {/* Модальное окно создания истории */}
      {showCreateStory && currentUser && (
        <CreateStory
          userId={currentUser.id}
          onClose={() => setShowCreateStory(false)}
          onSuccess={handleStoryCreated}
        />
      )}
    </>
  )
}
