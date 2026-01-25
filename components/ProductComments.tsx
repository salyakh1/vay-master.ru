'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@/app/providers'
import { supabase, ProductComment, User } from '@/lib/supabase'
import { FiSend, FiEdit2, FiTrash2, FiMessageCircle } from 'react-icons/fi'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

const INITIAL_REPLIES_VISIBLE = 10

function collectDescendants(c: { replies?: any[] }): any[] {
  if (!c.replies?.length) return []
  return c.replies.flatMap((r: any) => [r, ...collectDescendants(r)])
}

function pluralReplies(x: number) {
  return x === 1 ? 'ответ' : x >= 2 && x <= 4 ? 'ответа' : 'ответов'
}

interface ProductCommentsProps {
  productId: string
  currentUser: User | null
  openReplyToId?: string | null
}

export default function ProductComments({ productId, currentUser, openReplyToId }: ProductCommentsProps) {
  const [comments, setComments] = useState<(ProductComment & { author?: User; replies?: ProductComment[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchComments()
  }, [productId])

  useEffect(() => {
    if (openReplyToId) setReplyingToCommentId(openReplyToId)
  }, [openReplyToId])

  useEffect(() => {
    if (loading || comments.length === 0) return
    const id = (typeof window !== 'undefined' && window.location.hash?.slice(1)) || openReplyToId
    if (!id) return
    const target = id.startsWith('comment-') ? id : `comment-${id}`
    const el = document.getElementById(target)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }, [loading, comments.length, openReplyToId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}/comments`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !commentText.trim()) return

    setSaving(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/products/${productId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create comment')
      }

      setCommentText('')
      setShowForm(false)
      fetchComments()
    } catch (error: any) {
      console.error('Error creating comment:', error)
      alert(error.message || 'Ошибка при создании комментария')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!currentUser || !replyText.trim()) return

    setSaving(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/products/${productId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: replyText.trim(),
          parentCommentId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create reply')
      }

      setReplyText('')
      setReplyingToCommentId(null)
      fetchComments()
    } catch (error: any) {
      console.error('Error creating reply:', error)
      alert(error.message || 'Ошибка при создании ответа')
    } finally {
      setSaving(false)
    }
  }

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!currentUser || !newContent.trim()) return

    setSaving(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/products/${productId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newContent.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update comment')
      }

      setEditingCommentId(null)
      fetchComments()
    } catch (error: any) {
      console.error('Error updating comment:', error)
      alert(error.message || 'Ошибка при обновлении комментария')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !confirm('Вы уверены, что хотите удалить комментарий?')) return

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/products/${productId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete comment')
      }

      fetchComments()
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      alert(error.message || 'Ошибка при удалении комментария')
    }
  }

  const CommentItem = ({ comment, level = 0, isInFlatRepliesList = false }: { comment: ProductComment & { author?: User; replies?: ProductComment[] }; level?: number; isInFlatRepliesList?: boolean }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editText, setEditText] = useState(comment.content)

    const isOwnComment = currentUser?.id === comment.author_id
    const timeAgo = format(new Date(comment.created_at), 'd MMMM yyyy в HH:mm', { locale: ru })

    return (
      <div id={`comment-${comment.id}`} className={`${level > 0 ? 'ml-8 mt-3 border-l-2 border-border-light/40 pl-4' : ''}`}>
        <div className="flex gap-3">
          <Link href={`/profile/${comment.author_id}`} className="flex-shrink-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-border-light/60">
              {comment.author?.avatar_url ? (
                <Image
                  src={comment.author.avatar_url}
                  alt={comment.author.full_name}
                  fill
                  className="object-cover rounded-full"
                  sizes="40px"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-sm font-semibold">
                  {comment.author?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${comment.author_id}`} className="font-semibold text-graphite-secondary hover:text-brand-accent transition-colors">
                  {comment.author?.full_name || 'Пользователь'}
                </Link>
                <span className="text-xs text-text-secondary ml-2">{timeAgo}</span>
              </div>
              {isOwnComment && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setEditText(comment.content)
                    }}
                    className="p-1.5 text-text-secondary hover:text-brand-accent transition-colors"
                    title="Редактировать"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
                    title="Удалить"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="input w-full resize-none text-sm"
                  maxLength={1000}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-graphite-secondary"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      handleEditComment(comment.id, editText)
                      setIsEditing(false)
                    }}
                    disabled={!editText.trim() || saving}
                    className="btn btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap mb-2">
                  {comment.content}
                </p>
                {currentUser && (
                  <button
                    onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-brand-accent transition-colors"
                  >
                    <FiMessageCircle size={12} />
                    <span>Ответить</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Форма ответа — под комментарием с тем же отступом, что и ответы */}
        {replyingToCommentId === comment.id && currentUser && (
          <div className="mt-3 ml-8 pl-4 border-l-2 border-border-light/40">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              className="input w-full resize-none text-sm mb-2"
              placeholder="Написать ответ..."
              maxLength={500}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setReplyingToCommentId(null)
                  setReplyText('')
                }}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-graphite-secondary"
              >
                Отмена
              </button>
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={!replyText.trim() || saving}
                className="btn btn-primary text-sm px-4 py-1.5 disabled:opacity-50 flex items-center gap-1.5"
              >
                <FiSend size={14} />
                Отправить
              </button>
            </div>
          </div>
        )}

        {/* Ответы в стиле Instagram: один уровень отступа, «Показать N» / «Посмотреть ещё X» / «Скрыть» */}
        {!isInFlatRepliesList &&
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
                  className="text-xs text-text-secondary hover:text-brand-accent transition-colors"
                >
                  Показать {n} {pluralReplies(n)}
                </button>
              ) : (
                <>
                  {toShow.map((reply) => (
                    <CommentItem key={reply.id} comment={reply as ProductComment & { author?: User; replies?: ProductComment[] }} level={1} isInFlatRepliesList />
                  ))}
                  {moreCount > 0 && !showAllReplies[comment.id] && (
                    <button
                      type="button"
                      onClick={() => setShowAllReplies((prev) => ({ ...prev, [comment.id]: true }))}
                      className="text-xs text-text-secondary hover:text-brand-accent transition-colors mt-1"
                    >
                      Посмотреть ещё {moreCount} {pluralReplies(moreCount)}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: false }))}
                    className="text-xs text-text-secondary hover:text-brand-accent transition-colors mt-2"
                  >
                    Скрыть ответы
                  </button>
                </>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div className="card mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Комментарии</h2>
          {productId && (
            <p className="text-sm text-gray-500">
              {comments.length} {comments.length === 1 ? 'комментарий' : comments.length < 5 ? 'комментария' : 'комментариев'}
            </p>
          )}
        </div>
        {currentUser && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary text-sm w-full sm:w-auto"
          >
            {showForm ? 'Отмена' : 'Написать комментарий'}
          </button>
        )}
      </div>

      {/* Форма создания комментария */}
      {showForm && currentUser && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            className="input w-full resize-none mb-3"
            placeholder="Написать комментарий..."
            maxLength={1000}
            required
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-text-secondary">
              {commentText.length}/1000
            </div>
            <button
              type="submit"
              disabled={!commentText.trim() || saving}
              className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-2"
            >
              <FiSend size={16} />
              {saving ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      )}

      {/* Список комментариев */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">
          Загрузка комментариев...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          Пока нет комментариев
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}
