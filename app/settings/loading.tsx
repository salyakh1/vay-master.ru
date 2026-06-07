export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-20">
      <div className="max-w-lg mx-auto">
        <div className="bg-white border-b border-[#e5e5ea] px-4 py-3">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-[30px] h-[30px] rounded-lg bg-[#f2f2f7] animate-pulse" />
            <div className="h-5 w-28 bg-[#f2f2f7] rounded animate-pulse" />
          </div>
          <div className="h-[76px] bg-[#f9f9fb] rounded-[14px] border border-[#e5e5ea] animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mx-3 mt-3">
            <div className="h-3 w-24 bg-[#e5e5ea] rounded mb-1.5 animate-pulse" />
            <div className="bg-white rounded-[14px] border border-[#e5e5ea] p-3 space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-[#f2f2f7] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 bg-[#f2f2f7] rounded animate-pulse" />
                    <div className="h-2.5 w-1/2 bg-[#f2f2f7] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
