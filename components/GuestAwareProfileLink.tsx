'use client'

import Link from 'next/link'

interface GuestAwareProfileLinkProps {
  profileId: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

/** Профиль публичный: гости идут на витрину, не на логин. */
export default function GuestAwareProfileLink({
  profileId,
  children,
  className,
  onClick,
}: GuestAwareProfileLinkProps) {
  return (
    <Link href={`/profile/${profileId}`} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
