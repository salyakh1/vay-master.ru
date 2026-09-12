export default function PlannerLoading() {
  return (
    <div className="min-h-screen bg-[#f4f4f4] max-w-lg mx-auto w-full pb-28">
      <div className="bg-white border-b border-[#e5e5ea] px-4 pt-3 pb-2">
        <div className="h-5 w-40 bg-[#f0f0f0] rounded animate-pulse" />
        <div className="h-3 w-56 bg-[#f0f0f0] rounded mt-2 animate-pulse" />
      </div>
      <div className="grid grid-cols-4 bg-white border-b border-[#e5e5ea]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 mx-2 my-2 bg-[#f0f0f0] rounded animate-pulse" />
        ))}
      </div>
      <div className="mx-3 mt-3 h-24 bg-white rounded-2xl border border-[#ececec] animate-pulse" />
      <div className="mx-3 mt-3 h-12 bg-white rounded-xl animate-pulse" />
      <div className="mx-3 mt-3 h-[220px] bg-white rounded-2xl border border-[#ececec] animate-pulse" />
    </div>
  )
}
