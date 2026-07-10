import { MasterListCardSkeleton } from '@/components/search/MasterListCard'

export default function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-24">
      <div className="bg-white px-3.5 pt-2.5 pb-2.5 border-b border-[#f0f0f0]">
        <div className="flex gap-2 mb-2.5">
          <div className="flex-1 h-9 bg-[#f2f2f7] rounded-xl animate-pulse border border-[#ececec]" />
          <div className="w-16 h-9 bg-[#f2f2f7] rounded-[10px] animate-pulse border border-[#ececec]" />
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-16 bg-[#f2f2f7] rounded-full animate-pulse border border-[#eee] flex-shrink-0" />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2">
        <div className="h-6 w-16 bg-white rounded-full animate-pulse border border-[#e5e5ea]" />
        <div className="h-6 w-24 bg-white rounded-full animate-pulse border border-[#e5e5ea]" />
      </div>

      <div className="px-3.5 py-2">
        <div className="h-4 w-40 bg-[#f2f2f7] rounded animate-pulse mb-3" />
        <div className="flex gap-2.5 overflow-hidden pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[144px] h-[120px] bg-white rounded-2xl border border-[#e5e5ea] animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>

      <div className="bg-white px-3.5 pt-3 pb-2">
        <div className="h-3.5 w-28 bg-[#f2f2f7] rounded animate-pulse mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <MasterListCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
