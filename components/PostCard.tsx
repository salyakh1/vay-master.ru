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
      <div className="flex items-start gap-4 mb-4">
        <Link href={`/profile/${user?.id || post.user_id}`}>
          <div className="w-12 h-12 border border-gray-200 bg-black flex items-center justify-center text-white text-sm font-bold cursor-pointer">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.full_name?.[0]?.toUpperCase() || '?'
            )}
          </div>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${user?.id || post.user_id}`}>
            <div className="font-semibold hover:text-black cursor-pointer text-black">
              {user?.full_name || 'Пользователь'}{' '}
              {user?.role && (
                <span className="text-base">
                  {roleEmoji[user.role as keyof typeof roleEmoji]}
                </span>
              )}
            </div>
          </Link>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {user?.city && `${user.city} • `}
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: ru,
            })}
          </div>
        </div>
      </div>

      <div className="mb-4 whitespace-pre-wrap text-black leading-relaxed">{post.content}</div>

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {post.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Post image ${idx + 1}`}
              className="w-full h-48 object-cover border border-gray-200"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${
            liked 
              ? 'text-black' 
              : 'text-gray-500 hover:text-black'
          }`}
        >
          <FiHeart size={18} fill={liked ? 'currentColor' : 'none'} />
          <span className="text-sm font-medium">{likesCount}</span>
        </button>
        <div className="flex items-center gap-2 text-gray-500 hover:text-black px-3 py-1.5 transition-colors cursor-pointer">
          <FiMessageCircle size={18} />
          <span className="text-sm font-medium">Комментарии</span>
        </div>
      </div>
    </div>
  )
}

