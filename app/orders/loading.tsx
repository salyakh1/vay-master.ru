export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full">
      <div className="bg-white border-b border-[#f0f0f0] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-32 bg-[#f0f0f0] rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-[#f0f0f0] rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#f0f0f0] rounded-xl h-14 animate-pulse" />
          ))}
        </div>
        <div className="flex gap-0 border-b border-[#f0f0f0]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-8 bg-[#f0f0f0] animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-3 border border-[#f0f0f0] animate-pulse h-36"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  )
}
