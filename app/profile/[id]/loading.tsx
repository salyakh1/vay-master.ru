export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-24 animate-pulse">
      <div className="bg-white px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#f0f0f0]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#f0f0f0] rounded w-2/3" />
            <div className="h-3 bg-[#f0f0f0] rounded w-1/2" />
          </div>
        </div>
        <div className="h-9 bg-[#f0f0f0] rounded-xl mb-2" />
        <div className="h-9 bg-[#f0f0f0] rounded-xl" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-[#e8e8ed]" />
        ))}
      </div>
    </div>
  )
}
