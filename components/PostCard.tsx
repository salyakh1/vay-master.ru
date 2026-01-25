'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
          <div className="relative w-12 h-12 border border-border-light bg-graphite-primary flex items-center justify-center text-white text-sm font-semibold cursor-pointer rounded-md overflow-hidden">
            {user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.full_name}
                fill
                className="object-cover rounded-md"
                sizes="48px"
                loading="lazy"
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
            <div key={idx} className="relative w-full h-48 border border-border-light rounded-md overflow-hidden">
              <Image
                src={img}
                alt={`Post image ${idx + 1}`}
                fill
                className="object-cover rounded-md"
                sizes="(max-width: 768px) 50vw, 300px"
                loading="lazy"
              />
            </div>
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

