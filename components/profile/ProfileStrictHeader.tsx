'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FiMessageCircle, FiShare2 } from 'react-icons/fi'
import type { User } from '@/lib/supabase'
import { getInitials, yearsOnSite, yearsOnSiteLabel } from './profile-utils'

type ProfileStrictHeaderProps = {
  profile: User
  displayRoleLabel: string
  isOwnProfile: boolean
  isFollowing: boolean
  followLoading: boolean
  followersCount: number
  followingCount: number
  productsCount?: number
  onFollow: () => void
  onMessage: () => void
  onFollowersClick: () => void
  onEdit?: () => void
  backHref?: string | null
  requireAuth?: boolean
  loginHref?: string
}

export default function ProfileStrictHeader({
  profile,
  displayRoleLabel,
  isOwnProfile,
  isFollowing,
  followLoading,
  followersCount,
  followingCount,
  productsCount = 0,
  onFollow,
  onMessage,
  onFollowersClick,
  onEdit,
  backHref,
  requireAuth = false,
  loginHref = '/auth/login',
}: ProfileStrictHeaderProps) {
  const router = useRouter()
  const isMaster = profile.role === 'master'
  const isSeller = profile.role === 'seller'
  const rating = isMaster ? profile.master_rating : isSeller ? profile.seller_rating : undefined
  const reviewsCount = isMaster
    ? profile.master_reviews_count ?? 0
    : isSeller
      ? profile.seller_reviews_count ?? 0
      : 0

  const rolePillClass =
    profile.role === 'seller'
      ? 'text-[#0C447C] bg-[#E6F1FB]'
      : profile.role === 'master'
        ? 'text-brand-accent bg-[#fdedec]'
        : 'text-[#3b6d11] bg-[#eaf3de]'

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.full_name, url })
      } catch {
        /* cancelled */
      }
    } else if (url) {
      await navigator.clipboard.writeText(url)
    }
  }

  const handleBack = () => {
    if (backHref) router.push(backHref)
    else router.back()
  }

  return (
    <div className="mb-0">
      <div
        className={`relative h-[120px] flex-shrink-0 ${profile.cover_photo_url ? '' : 'bg-[#1c1c1e]'}`}
      >
        {profile.cover_photo_url && (
          <img src={profile.cover_photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <button
          type="button"
          onClick={handleBack}
          className="absolute top-2.5 left-2.5 w-[26px] h-[26px] rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-[13px]"
          aria-label="Назад"
        >
          ←
        </button>
      </div>

      <div className="bg-white px-3.5 pb-3.5">
        <div className="flex items-end justify-between -mt-7 mb-2">
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center text-white text-lg font-medium overflow-hidden shadow-sm ${
                isSeller ? 'bg-[#1d5fa6]' : 'bg-brand-accent'
              }`}
            >
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>
            {profile.is_pro && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent text-white text-[8px] font-medium px-1 py-0.5 rounded-[3px] border-2 border-white">
                PRO
              </span>
            )}
          </div>
          {isOwnProfile ? (
            <button
              type="button"
              onClick={onEdit}
              className="bg-[#f4f4f4] border border-[#e5e7eb] text-[#111] text-[11px] font-medium px-3 py-2 rounded-[10px]"
            >
              Редактировать
            </button>
          ) : (
            <span className="text-[11px] text-[#9ca3af]">{yearsOnSiteLabel(profile.created_at)}</span>
          )}
        </div>

        <h1 className="text-[17px] font-medium text-[#111111] mb-1">{profile.full_name}</h1>
        <div className="flex items-center flex-wrap gap-1.5 mb-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${rolePillClass}`}>
            {displayRoleLabel}
          </span>
          {profile.city && <span className="text-[11px] text-[#6b7280]">{profile.city}</span>}
        </div>

        {profile.description && (
          <p className="text-[12px] text-[#374151] leading-relaxed mb-3">{profile.description}</p>
        )}

        {isMaster || isSeller ? (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="bg-[#f4f4f4] rounded-[10px] py-2 px-1 text-center">
              <p className="text-[14px] font-medium text-[#eab308] leading-none">
                {rating && rating > 0 ? rating.toFixed(1) : '—'}
              </p>
              <p className="text-[8px] text-[#9ca3af] mt-0.5">рейтинг</p>
            </div>
            <div className="bg-[#f4f4f4] rounded-[10px] py-2 px-1 text-center">
              <p className="text-[14px] font-medium text-[#111111] leading-none">{reviewsCount}</p>
              <p className="text-[8px] text-[#9ca3af] mt-0.5">отзывы</p>
            </div>
            <button type="button" onClick={onFollowersClick} className="bg-[#f4f4f4] rounded-[10px] py-2 px-1 text-center">
              <p className="text-[14px] font-medium text-[#111111] leading-none">
                {isSeller ? productsCount : followersCount}
              </p>
              <p className="text-[8px] text-[#9ca3af] mt-0.5">{isSeller ? 'товары' : 'подписчики'}</p>
            </button>
          </div>
        ) : null}

        {!isOwnProfile && profile.role !== 'client' && (
          <div className="flex gap-1.5 items-center">
            {requireAuth ? (
              <Link
                href={loginHref}
                className="flex-1 bg-brand-accent text-white text-[12px] font-medium py-2.5 rounded-[10px] flex items-center justify-center gap-1.5"
              >
                Войти, чтобы написать
              </Link>
            ) : (
              <button
                type="button"
                onClick={onMessage}
                className="flex-1 bg-brand-accent text-white text-[12px] font-medium py-2.5 rounded-[10px] flex items-center justify-center gap-1.5"
              >
                <FiMessageCircle size={14} />
                Написать
              </button>
            )}
            {!requireAuth && (
              <button
                type="button"
                onClick={onFollow}
                disabled={followLoading}
                className="flex-1 bg-[#f4f4f4] border border-[#e5e7eb] text-[#111111] text-[12px] font-medium py-2.5 rounded-[10px]"
              >
                {followLoading ? '…' : isFollowing ? 'Отписаться' : 'Подписка'}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 bg-[#f4f4f4] border border-[#e5e7eb] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[#374151]"
              aria-label="Поделиться"
            >
              <FiShare2 size={14} />
            </button>
          </div>
        )}

        {isOwnProfile && (
          <p className="text-[10px] text-[#9ca3af] mt-2">
            {followersCount} подписчиков · {followingCount} подписок · на сайте {yearsOnSite(profile.created_at)}
          </p>
        )}
      </div>
    </div>
  )
}
