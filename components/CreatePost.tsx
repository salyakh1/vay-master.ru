'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'

interface CreatePostProps {
  onPostCreated: () => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
        })

      if (error) throw error

      setContent('')
      onPostCreated()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Ошибка при создании публикации')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 border border-gray-200 bg-black flex items-center justify-center text-white text-sm font-bold">
            {user.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-black font-medium text-sm">{user.full_name}</span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Что у вас нового?"
          className="textarea"
          rows={4}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="btn btn-primary"
          >
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </div>
  )
}

