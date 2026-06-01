'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { profileLoginUrl } from '@/lib/guest-access'

interface GuestAwareProfileLinkProps {
  profileId: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function GuestAwareProfileLink({
  profileId,
  children,
  className,
  onClick,
}: GuestAwareProfileLinkProps) {
  const { user } = useAuth()
  const router = useRouter()

  if (user) {
    return (
      <Link href={`/profile/${profileId}`} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.()
        router.push(profileLoginUrl(profileId))
      }}
    >
      {children}
    </button>
  )
}
