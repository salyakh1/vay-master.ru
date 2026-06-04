export default function ChatsLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full">
      <div className="bg-white border-b border-[#f0f0f0] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-24 bg-[#f0f0f0] rounded-lg animate-pulse" />
          <div className="h-8 w-8 bg-[#f0f0f0] rounded-full animate-pulse" />
        </div>
        <div className="h-10 bg-[#f0f0f0] rounded-xl animate-pulse" />
      </div>
      <div className="bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3 border-b border-[#f8f8f8]">
            <div className="w-11 h-11 rounded-full bg-[#f0f0f0] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-[#f0f0f0] rounded w-2/3 animate-pulse" />
              <div className="h-3 bg-[#f0f0f0] rounded w-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
