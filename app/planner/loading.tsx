export default function PlannerLoading() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-28">
      <div className="bg-white border-b border-[#e5e5ea]/80 px-4 py-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f2f2f7] animate-pulse" />
        <div className="h-4 flex-1 bg-[#f2f2f7] rounded animate-pulse" />
        <div className="h-8 w-16 bg-[#f2f2f7] rounded-lg animate-pulse" />
      </div>
      <div className="bg-white border-b border-[#e5e5ea]/80 px-4 py-3 flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div className="w-6 h-6 rounded-full bg-[#f2f2f7] animate-pulse flex-shrink-0" />
            {i < 3 && <div className="flex-1 h-[1.5px] bg-[#f2f2f7] animate-pulse" />}
          </div>
        ))}
      </div>
      <div className="mx-3 mt-3 h-[280px] bg-white rounded-xl border border-[#e5e5ea]/80 animate-pulse" />
      <div className="mx-3 mt-3 h-16 bg-white rounded-xl border border-[#e5e5ea]/80 animate-pulse" />
      <div className="mx-3 mt-3 h-20 bg-white rounded-xl border border-[#e5e5ea]/80 animate-pulse" />
    </div>
  )
}
