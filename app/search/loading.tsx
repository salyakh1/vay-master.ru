export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] pt-4 pb-20">
      <div className="max-w-lg mx-auto">
        <div className="h-10 bg-white rounded-xl mx-3.5 mb-3 animate-pulse border border-[#f0f0f0]" />
        <div className="flex gap-2 px-3.5 mb-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-16 bg-white rounded-full animate-pulse border border-[#f0f0f0] flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 px-3.5 py-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#f0f0f0] overflow-hidden animate-pulse">
              <div className="aspect-square bg-[#f2f2f7]" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-[#f2f2f7] rounded w-3/4" />
                <div className="h-2 bg-[#f2f2f7] rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
