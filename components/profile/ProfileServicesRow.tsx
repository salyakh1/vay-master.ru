'use client'

import { FiChevronUp } from 'react-icons/fi'
import { buildServicesSummary } from './ProfileServicesSheet'

type ProfileServicesRowProps = {
  serviceNames: string[]
  onClick: () => void
}

export default function ProfileServicesRow({ serviceNames, onClick }: ProfileServicesRowProps) {
  if (serviceNames.length === 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white mt-2 px-3.5 py-3.5 flex items-center justify-between text-left active:bg-[#fafafa] transition-colors"
    >
      <div className="min-w-0 pr-3">
        <p className="text-[13px] font-medium text-[#111111] mb-0.5">Услуги</p>
        <p className="text-[11px] text-[#9ca3af] truncate">{buildServicesSummary(serviceNames)}</p>
      </div>
      <FiChevronUp size={16} className="text-[#9ca3af] flex-shrink-0" aria-hidden />
    </button>
  )
}
