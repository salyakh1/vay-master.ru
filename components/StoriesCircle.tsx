'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Story, User } from '@/lib/supabase'
import { FiPlus } from 'react-icons/fi'

const StoryViewer = dynamic(() => import('./StoryViewer'), {
  ssr: false,
})

const CreateStory = dynamic(() => import('./CreateStory'), {
  ssr: false,
})

interface StoriesCircleProps {
  stories: Story[]
  currentUser?: User | null
  /** Свой профиль — кнопка «+» (совместимость) */
  isOwnProfile?: boolean
  /** Явно показать «+» в начале ряда (лента, товары, мастера) */
  showCreateButton?: boolean
  onStoryCreated?: () => void
}

export default function StoriesCircle({
  stories,
  currentUser,
  isOwnProfile = false,
  showCreateButton,
  onStoryCreated,
}: StoriesCircleProps) {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null)
  const [showCreateStory, setShowCreateStory] = useState(false)

  const canCreate =
    (showCreateButton ?? isOwnProfile) &&
    !!currentUser &&
    (currentUser.role === 'master' || currentUser.role === 'seller')

  const storiesByUser = new Map<string, { user: User; stories: Story[] }>()

  stories.forEach((story) => {
    if (!story.user) return
    if (!storiesByUser.has(story.user.id)) {
      storiesByUser.set(story.user.id, {
        user: story.user,
        stories: [],
      })
    }
    storiesByUser.get(story.user.id)!.stories.push(story)
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
    onStoryCreated?.()
  }

  if (storiesArray.length === 0 && !canCreate) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {canCreate && (
          <button
            type="button"
            onClick={handleCreateStory}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-border-light flex items-center justify-center bg-bg-secondary hover:bg-bg-secondary/80 transition-colors">
              {currentUser?.avatar_url ? (
                <>
                  <Image
                    src={currentUser.avatar_url}
                    alt=""
                    width={64}
                    height={64}
                    className="absolute inset-0 w-full h-full rounded-full object-cover opacity-40"
                    unoptimized={!String(currentUser.avatar_url).includes('supabase')}
                  />
                  <span className="relative z-10 w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center">
                    <FiPlus size={14} />
                  </span>
                </>
              ) : (
                <FiPlus size={24} className="text-text-secondary" />
              )}
            </div>
            <span className="text-xs text-text-secondary">Ваша</span>
          </button>
        )}

        {storiesArray.map((item, index) => {
          const hasUnviewed = item.stories.some((s) => !s.viewed_by_user)
          const user = item.user

          const latestStory = item.stories
            ? [...item.stories].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
            : null

          const previewMedia = latestStory?.media?.[0] || null

          return (
            <button
              key={user.id}
              type="button"
              onClick={() => handleStoryClick(index)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    hasUnviewed
                      ? 'bg-gradient-to-r from-brand-accent to-brand-accent-hover'
                      : 'bg-border-light'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary">
                    {previewMedia ? (
                      <Image
                        src={previewMedia}
                        alt={user.full_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized={!String(previewMedia).includes('supabase')}
                      />
                    ) : user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.full_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized={!String(user.avatar_url).includes('supabase')}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white font-semibold">
                        {user.full_name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
                {hasUnviewed && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-accent rounded-full border-2 border-bg-primary" />
                )}
              </div>
              <span className="text-xs text-text-secondary truncate max-w-[64px]">
                {user.full_name}
              </span>
            </button>
          )
        })}
      </div>

      {selectedStoryIndex !== null && (
        <StoryViewer
          stories={storiesArray}
          initialIndex={selectedStoryIndex}
          currentUserId={currentUser?.id}
          onClose={handleCloseViewer}
        />
      )}

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
