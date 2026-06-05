'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FiMessageCircle, FiShare2 } from 'react-icons/fi'
import type { User } from '@/lib/supabase'
import { getInitials, yearsOnSite } from './profile-utils'

type SubcategoryChip = { id: string; name: string }

type ProfileStrictHeaderProps = {
  profile: User
  displayRoleLabel: string
  isOwnProfile: boolean
  isFollowing: boolean
  followLoading: boolean
  followersCount: number
  followingCount: number
  profileSubcategories: SubcategoryChip[]
  ordersCount?: number
  productsCount?: number
  onFollow: () => void
  onMessage: () => void
  onFollowersClick: () => void
  onEdit?: () => void
  backHref?: string | null
}

export default function ProfileStrictHeader({
  profile,
  displayRoleLabel,
  isOwnProfile,
  isFollowing,
  followLoading,
  followersCount,
  followingCount,
  profileSubcategories,
  ordersCount = 0,
  productsCount = 0,
  onFollow,
  onMessage,
  onFollowersClick,
  onEdit,
  backHref,
}: ProfileStrictHeaderProps) {
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
      ? 'text-[#1d3557] bg-[#eaf0f8]'
      : profile.role === 'master'
        ? 'text-[#c0392b] bg-[#fdf0f0]'
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

  return (
    <div className="mb-2">
      <div
        className={`relative h-[140px] sm:h-[168px] flex-shrink-0 ${profile.cover_photo_url ? '' : 'bg-[#1c1c1e]'}`}
      >
        {profile.cover_photo_url && (
          <img src={profile.cover_photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute top-2.5 right-3 flex gap-1.5">
          {backHref && (
            <Link
              href={backHref}
              className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-sm"
              aria-label="Назад"
            >
              ←
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white px-4 pb-4">
        <div className="flex items-end justify-between -mt-7 mb-2.5">
          <div className="relative flex-shrink-0">
            <div className="w-[60px] h-[60px] rounded-full border-[3px] border-white bg-[#c0392b] flex items-center justify-center text-white text-lg font-semibold overflow-hidden shadow-sm">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={60} height={60} className="object-cover w-full h-full" />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>
            {profile.is_pro && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-[#c0392b] text-white text-[7px] font-bold px-1 py-0.5 rounded border-[1.5px] border-white">
                PRO
              </span>
            )}
          </div>
          {isOwnProfile ? (
            <button
              type="button"
              onClick={onEdit}
              className="bg-[#f2f2f7] border border-[#e5e5ea] text-[#1c1c1e] text-[11px] font-semibold px-3.5 py-2 rounded-lg"
            >
              Редактировать
            </button>
          ) : isSeller ? (
            <span className="text-[10px] text-[#8e8e93]">{productsCount} товаров</span>
          ) : null}
        </div>

        <h1 className="text-[17px] font-bold text-[#1c1c1e] tracking-tight mb-1">{profile.full_name}</h1>
        <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide ${rolePillClass}`}>
            {displayRoleLabel}
          </span>
          {profile.city && <span className="text-[10px] text-[#8e8e93]">{profile.city}</span>}
        </div>

        {isMaster && profileSubcategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {profileSubcategories.map((spec) => (
              <span
                key={spec.id}
                className="text-[10px] font-medium text-[#3c3c43] bg-[#f2f2f7] border border-[#e5e5ea] px-2 py-1 rounded-md"
              >
                {spec.name}
              </span>
            ))}
          </div>
        )}

        {isMaster && profileSubcategories.length === 0 && profile.specialization && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {profile.specialization.split(',').map((spec, i) => (
              <span
                key={i}
                className="text-[10px] font-medium text-[#3c3c43] bg-[#f2f2f7] border border-[#e5e5ea] px-2 py-1 rounded-md"
              >
                {spec.trim()}
              </span>
            ))}
          </div>
        )}

        {profile.description && (
          <p className="text-[12px] text-[#3c3c43] leading-relaxed mb-3">{profile.description}</p>
        )}

        <div className="grid grid-cols-4 gap-2 mb-3.5">
          <div className="bg-[#f2f2f7] rounded-lg py-2 text-center">
            <p className="text-[15px] font-bold text-[#e6a817] leading-none">
              {rating && rating > 0 ? rating.toFixed(1) : '—'}
            </p>
            <p className="text-[8px] text-[#8e8e93] font-medium mt-1 uppercase">Рейтинг</p>
          </div>
          <div className="bg-[#f2f2f7] rounded-lg py-2 text-center">
            <p className="text-[15px] font-bold text-[#1c1c1e] leading-none">{reviewsCount}</p>
            <p className="text-[8px] text-[#8e8e93] font-medium mt-1 uppercase">Отзывы</p>
          </div>
          <button type="button" onClick={onFollowersClick} className="bg-[#f2f2f7] rounded-lg py-2 text-center">
            <p className="text-[15px] font-bold text-[#1c1c1e] leading-none">{followersCount}</p>
            <p className="text-[8px] text-[#8e8e93] font-medium mt-1 uppercase">Подписчики</p>
          </button>
          <div className="bg-[#f2f2f7] rounded-lg py-2 text-center">
            <p className="text-[15px] font-bold text-[#1c1c1e] leading-none">
              {isMaster ? ordersCount : isSeller ? productsCount : followingCount}
            </p>
            <p className="text-[8px] text-[#8e8e93] font-medium mt-1 uppercase">
              {isMaster ? 'Заказы' : isSeller ? 'Товары' : 'Подписки'}
            </p>
          </div>
        </div>

        {!isOwnProfile && profile.role !== 'client' && (
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={onMessage}
              className="flex-1 bg-[#c0392b] text-white text-[12px] font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
            >
              <FiMessageCircle size={14} />
              Написать
            </button>
            <button
              type="button"
              onClick={onFollow}
              disabled={followLoading}
              className={`flex-1 text-[12px] font-semibold py-2.5 rounded-lg border ${
                isFollowing
                  ? 'bg-[#f2f2f7] text-[#1c1c1e] border-[#e5e5ea]'
                  : 'bg-[#f2f2f7] text-[#1c1c1e] border-[#e5e5ea]'
              }`}
            >
              {followLoading ? '…' : isFollowing ? 'Отписаться' : 'Подписка'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-[38px] h-[38px] bg-[#f2f2f7] border border-[#e5e5ea] rounded-lg flex items-center justify-center flex-shrink-0 text-[#3c3c43]"
              aria-label="Поделиться"
            >
              <FiShare2 size={16} />
            </button>
          </div>
        )}

        {isOwnProfile && (
          <p className="text-[10px] text-[#8e8e93] mt-2">
            {followersCount} подписчиков · {followingCount} подписок · на сайте {yearsOnSite(profile.created_at)}
          </p>
        )}
      </div>
    </div>
  )
}
