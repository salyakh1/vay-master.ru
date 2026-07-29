export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto w-full pb-24 animate-pulse">
      <div className="h-12 border-b border-[#efefef] bg-[#fafafa]" />
      <div className="flex gap-3 px-3 py-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-full bg-[#f0f0f0] flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-[#f0f0f0]" />
        ))}
      </div>
    </div>
  )
}
