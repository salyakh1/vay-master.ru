'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiSend } from 'react-icons/fi'
import { supabase, ProductComment, User } from '@/lib/supabase'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import { loginUrl } from '@/lib/guest-access'

type CommentNode = ProductComment & { author?: User; replies?: CommentNode[] }

function pluralComments(n: number) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return 'комментарий'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'комментария'
  return 'комментариев'
}

function collectDescendants(c: CommentNode): CommentNode[] {
  if (!c.replies?.length) return []
  return c.replies.flatMap((r) => [r, ...collectDescendants(r)])
}

function countAll(nodes: CommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countAll(n.replies || []), 0)
}

function addReplyToTree(nodes: CommentNode[], parentId: string, reply: CommentNode): CommentNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, replies: [...(n.replies || []), reply] }
    if (n.replies?.length) return { ...n, replies: addReplyToTree(n.replies, parentId, reply) }
    return n
  })
}

async function authHeaders() {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('Войдите, чтобы комментировать')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

interface ProductCommentsProps {
  productId: string
  currentUser: User | null
  sellerId?: string | null
  openReplyToId?: string | null
}

export default function ProductComments({
  productId,
  currentUser,
  sellerId,
  openReplyToId,
}: ProductCommentsProps) {
  const [comments, setComments] = useState<CommentNode[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const total = useMemo(() => countAll(comments), [comments])

  const fetchComments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch(`/api/products/${productId}/comments`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить комментарии')
      setComments(data.comments || [])
      setError(null)
    } catch (e) {
      console.error('Error fetching comments:', e)
      if (!silent) setError('Не удалось загрузить комментарии')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  useEffect(() => {
    if (openReplyToId) setReplyingToId(openReplyToId)
  }, [openReplyToId])

  useEffect(() => {
    if (loading || comments.length === 0) return
    const id = (typeof window !== 'undefined' && window.location.hash?.slice(1)) || openReplyToId
    if (!id) return
    const target = id.startsWith('comment-') ? id : `comment-${id}`
    const el = document.getElementById(target)
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }, [loading, comments.length, openReplyToId])

  useEffect(() => {
    if (replyingToId) replyRef.current?.focus()
  }, [replyingToId])

  const postComment = async (content: string, parentCommentId?: string) => {
    const postOnce = async () => {
      const headers = await authHeaders()
      const response = await fetch(`/api/products/${productId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, parentCommentId: parentCommentId || null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Не удалось отправить комментарий')
      return data.comment as CommentNode
    }

    try {
      return await postOnce()
    } catch {
      return await postOnce()
    }
  }

  const handleSubmitComment = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = commentText.trim()
    if (!currentUser || !text || saving) return

    const tempId = `temp-${Date.now()}`
    const optimistic: CommentNode = {
      id: tempId,
      product_id: productId,
      author_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
      author: currentUser,
      replies: [],
    }

    setSaving(true)
    setError(null)
    setComments((prev) => [optimistic, ...prev])
    setCommentText('')

    try {
      const created = await postComment(text)
      setComments((prev) => prev.map((c) => (c.id === tempId ? { ...created, replies: [] } : c)))
    } catch (err: unknown) {
      setComments((prev) => prev.filter((c) => c.id !== tempId))
      setCommentText(text)
      const message = err instanceof Error ? err.message : 'Ошибка при отправке комментария'
      setError(message)
    } finally {
      setSaving(false)
      composerRef.current?.focus()
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    const text = replyText.trim()
    if (!currentUser || !text || saving) return

    const tempId = `temp-reply-${Date.now()}`
    const optimistic: CommentNode = {
      id: tempId,
      product_id: productId,
      author_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
      parent_comment_id: parentId,
      author: currentUser,
      replies: [],
    }

    setSaving(true)
    setError(null)
    setComments((prev) => addReplyToTree(prev, parentId, optimistic))
    setReplyText('')
    setReplyingToId(null)

    try {
      const created = await postComment(text, parentId)
      setComments((prev) =>
        addReplyToTree(
          prev.map((c) => stripTemp(c, tempId)),
          parentId,
          { ...created, replies: [] }
        )
      )
    } catch (err: unknown) {
      setComments((prev) => prev.map((c) => stripTemp(c, tempId)))
      setReplyText(text)
      setReplyingToId(parentId)
      const message = err instanceof Error ? err.message : 'Ошибка при отправке ответа'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-8 bg-[#f7f9fc] border border-[#dbe7f3] rounded-2xl px-4 py-4">
      <div className="mb-3">
        <h2 className="text-[18px] font-extrabold text-[#111] leading-tight">Комментарии</h2>
        <p className="text-[12px] text-[#8e8e93] mt-0.5">
          {total} {pluralComments(total)}
        </p>
      </div>

      {currentUser ? (
        <form onSubmit={handleSubmitComment} className="mb-4">
          <div className="flex items-end gap-2">
            <Avatar user={currentUser} size={32} />
            <textarea
              ref={composerRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmitComment()
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder="Добавить комментарий…"
              className="flex-1 min-w-0 resize-none bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[13px] text-[#111] outline-none placeholder:text-[#bbb] leading-snug"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || saving}
              className="h-10 px-3 rounded-xl bg-[#e63946] text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40 flex-shrink-0"
            >
              <FiSend size={14} />
              {saving && !replyingToId ? '…' : 'Отправить'}
            </button>
          </div>
          <p className="text-[10px] text-[#bbb] mt-1 ml-10">{commentText.length}/1000</p>
        </form>
      ) : (
        <Link
          href={loginUrl(`/products/${productId}`)}
          className="block mb-4 text-[13px] text-[#8e8e93] bg-white border border-[#ececec] rounded-xl px-3 py-2.5"
        >
          Войдите, чтобы написать комментарий
        </Link>
      )}

      {error && (
        <p className="text-[12px] text-[#e63946] mb-3">{error}</p>
      )}

      {loading ? (
        <p className="text-center text-[12px] text-[#8e8e93] py-8">Загрузка комментариев…</p>
      ) : comments.length === 0 ? (
        <p className="text-center text-[12px] text-[#8e8e93] py-8">Пока нет комментариев</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              sellerId={sellerId}
              replyingToId={replyingToId}
              replyText={replyText}
              replyRef={replyRef}
              saving={saving}
              onReply={(id) => {
                setReplyingToId((prev) => (prev === id ? null : id))
                setReplyText('')
              }}
              onReplyText={setReplyText}
              onSubmitReply={handleSubmitReply}
              onCancelReply={() => {
                setReplyingToId(null)
                setReplyText('')
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function stripTemp(node: CommentNode, tempId: string): CommentNode {
  return {
    ...node,
    replies: (node.replies || []).filter((r) => r.id !== tempId).map((r) => stripTemp(r, tempId)),
  }
}

function Avatar({ user, size }: { user?: User | null; size: number }) {
  const name = user?.full_name || 'Пользователь'
  return (
    <div
      className="relative rounded-full overflow-hidden bg-[#e63946] flex-shrink-0 flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {user?.avatar_url ? (
        <Image src={user.avatar_url} alt="" fill className="object-cover" sizes={`${size}px`} />
      ) : (
        name[0]?.toUpperCase() || '?'
      )}
    </div>
  )
}

function RoleBadge({ authorId, sellerId, currentUserId }: { authorId: string; sellerId?: string | null; currentUserId?: string }) {
  if (sellerId && authorId === sellerId) {
    return <span className="inline-block ml-1 mr-1 text-[10px] font-bold text-[#e63946] align-middle">Продавец</span>
  }
  if (currentUserId && authorId === currentUserId) {
    return <span className="inline-block ml-1 mr-1 text-[10px] font-semibold text-[#8e8e93] align-middle">Вы</span>
  }
  return null
}

function CommentThread({
  comment,
  currentUser,
  sellerId,
  replyingToId,
  replyText,
  replyRef,
  saving,
  onReply,
  onReplyText,
  onSubmitReply,
  onCancelReply,
}: {
  comment: CommentNode
  currentUser: User | null
  sellerId?: string | null
  replyingToId: string | null
  replyText: string
  replyRef: React.Ref<HTMLTextAreaElement>
  saving: boolean
  onReply: (id: string) => void
  onReplyText: (v: string) => void
  onSubmitReply: (parentId: string) => void
  onCancelReply: () => void
}) {
  const replies = collectDescendants(comment).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div>
      <CommentRow
        comment={comment}
        currentUser={currentUser}
        sellerId={sellerId}
        onReply={() => onReply(comment.id)}
      />
      {replyingToId === comment.id && currentUser && (
        <ReplyComposer
          replyRef={replyRef}
          value={replyText}
          saving={saving}
          onChange={onReplyText}
          onSubmit={() => onSubmitReply(comment.id)}
          onCancel={onCancelReply}
        />
      )}
      {replies.length > 0 && (
        <div className="mt-2 ml-10 space-y-2.5 border-l border-[#ececec] pl-3">
          {replies.map((reply) => (
            <div key={reply.id}>
              <CommentRow
                comment={reply}
                currentUser={currentUser}
                sellerId={sellerId}
                compact
                onReply={() => onReply(reply.id)}
              />
              {replyingToId === reply.id && currentUser && (
                <ReplyComposer
                  replyRef={replyRef}
                  value={replyText}
                  saving={saving}
                  onChange={onReplyText}
                  onSubmit={() => onSubmitReply(reply.id)}
                  onCancel={onCancelReply}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommentRow({
  comment,
  currentUser,
  sellerId,
  compact,
  onReply,
}: {
  comment: CommentNode
  currentUser: User | null
  sellerId?: string | null
  compact?: boolean
  onReply: () => void
}) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })

  return (
    <div id={`comment-${comment.id}`} className="flex gap-2.5">
      <GuestAwareProfileLink profileId={comment.author_id} className="flex-shrink-0">
        <Avatar user={comment.author} size={compact ? 28 : 32} />
      </GuestAwareProfileLink>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#111] leading-snug">
          <GuestAwareProfileLink
            profileId={comment.author_id}
            className="font-bold mr-1.5 hover:text-[#e63946]"
          >
            {comment.author?.full_name || 'Пользователь'}
          </GuestAwareProfileLink>
          <RoleBadge authorId={comment.author_id} sellerId={sellerId} currentUserId={currentUser?.id} />
          <span className="font-normal whitespace-pre-wrap break-words"> {comment.content}</span>
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] text-[#8e8e93]">{timeAgo}</span>
          {currentUser && (
            <button
              type="button"
              onClick={onReply}
              className="text-[11px] font-semibold text-[#8e8e93] hover:text-[#e63946]"
            >
              Ответить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyComposer({
  replyRef,
  value,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  replyRef: React.Ref<HTMLTextAreaElement>
  value: string
  saving: boolean
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-2 ml-10">
      <textarea
        ref={replyRef as React.Ref<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          }
        }}
        rows={2}
        maxLength={500}
        placeholder="Ответ…"
        className="w-full resize-none bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[13px] text-[#111] outline-none placeholder:text-[#bbb]"
      />
      <div className="flex items-center justify-end gap-2 mt-1.5">
        <button type="button" onClick={onCancel} className="text-[11px] font-semibold text-[#8e8e93] px-2 py-1">
          Отмена
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || saving}
          className="h-8 px-3 rounded-lg bg-[#e63946] text-white text-[11px] font-semibold disabled:opacity-40"
        >
          Ответить
        </button>
      </div>
    </div>
  )
}
