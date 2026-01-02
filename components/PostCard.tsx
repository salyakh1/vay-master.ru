'use client'

import { useState, useEffect } from 'react'
import { supabase, Post } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiHeart, FiMessageCircle } from 'react-icons/fi'
import Link from 'next/link'

interface PostCardProps {
  post: Post
  currentUserId: string
  onUpdate: () => void
}

export default function PostCard({ post, currentUserId, onUpdate }: PostCardProps) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)

  useEffect(() => {
    checkLiked()
  }, [post.id, currentUserId])

  const checkLiked = async () => {
    try {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .single()

      setLiked(!!data)
    } catch (error) {
      setLiked(false)
    }
  }

  const handleLike = async () => {
    try {
      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)

        if (error) throw error
        setLiked(false)
        setLikesCount((prev) => prev - 1)
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          })

        if (error) throw error
        setLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const user = post.user as any
  const roleEmoji = {
    master: '🔨',
    seller: '🛒',
    client: '👤',
  }

  return (
    <div className="card">
      <div className="flex items-start gap-4 mb-6">
        <Link href={`/profile/${user?.id || post.user_id}`}>
          <div className="w-12 h-12 border border-border-light bg-graphite-primary flex items-center justify-center text-white text-sm font-semibold cursor-pointer rounded-md">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-full h-full object-cover rounded-md"
              />
            ) : (
              user?.full_name?.[0]?.toUpperCase() || '?'
            )}
          </div>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${user?.id || post.user_id}`}>
            <div className="font-semibold hover:text-graphite-secondary cursor-pointer text-graphite-secondary">
              {user?.full_name || 'Пользователь'}
            </div>
          </Link>
          <div className="text-xs text-text-muted font-medium mt-1">
            {user?.city && `${user.city} • `}
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: ru,
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 whitespace-pre-wrap text-text-primary leading-relaxed">{post.content}</div>

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {post.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Post image ${idx + 1}`}
              className="w-full h-48 object-cover border border-border-light rounded-md"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 pt-6 border-t border-border-light">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${
            liked 
              ? 'text-brand-accent' 
              : 'text-text-secondary hover:text-graphite-secondary'
          }`}
        >
          <FiHeart size={18} fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 2.5 : 2} />
          <span className="text-sm font-medium">{likesCount}</span>
        </button>
        <div className="flex items-center gap-2 text-text-secondary hover:text-graphite-secondary px-3 py-1.5 transition-colors cursor-pointer">
          <FiMessageCircle size={18} strokeWidth={2} />
          <span className="text-sm font-medium">Комментарии</span>
        </div>
      </div>
    </div>
  )
}

