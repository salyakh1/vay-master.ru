'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Chat, Message, User } from '@/lib/supabase'
import { ROLE_CONFIG, getInitials, formatChatListTime, formatMessagePreview } from './chat-utils'

type ChatListItemProps = {
  chat: Chat & { otherUser: User; lastMessage?: Message; unreadCount?: number }
  currentUserId: string
}

export default function ChatListItem({ chat, currentUserId }: ChatListItemProps) {
  const { otherUser, lastMessage, unreadCount = 0 } = chat
  const unread = unreadCount > 0
  const isOwnLast = lastMessage?.sender_id === currentUserId
  const roleCfg = ROLE_CONFIG[otherUser.role] ?? ROLE_CONFIG.client

  return (
    <Link
      href={`/chats/${chat.id}`}
      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border-b border-[#f8f8f8] active:bg-[#fafafa]"
    >
      <div className="relative flex-shrink-0">
        {otherUser.avatar_url ? (
          <Image
            src={otherUser.avatar_url}
            alt=""
            width={46}
            height={46}
            className="rounded-full object-cover w-[46px] h-[46px]"
          />
        ) : (
          <div className="w-[46px] h-[46px] rounded-full bg-[#e63946] flex items-center justify-center text-white text-sm font-bold">
            {getInitials(otherUser.full_name)}
          </div>
        )}
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#e63946] rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-extrabold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center min-w-0 gap-1">
            <span className="text-[13px] font-bold text-[#111] truncate max-w-[140px]">
              {otherUser.full_name}
            </span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-lg flex-shrink-0 ${roleCfg.className}`}>
              {roleCfg.label}
            </span>
          </div>
          {lastMessage && (
            <span className="text-[10px] text-[#bbb] flex-shrink-0">
              {formatChatListTime(new Date(lastMessage.created_at))}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className={`text-[11px] truncate max-w-[220px] ${
              unread ? 'font-semibold text-[#333]' : 'text-[#888]'
            }`}
          >
            {formatMessagePreview(lastMessage.content, isOwnLast, !!lastMessage.image_url)}
          </p>
        )}
      </div>
    </Link>
  )
}
