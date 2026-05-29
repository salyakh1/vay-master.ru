export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-bg-primary pt-4 pb-20">
      <div className="max-w-2xl mx-auto px-4">
        <div className="h-[200px] bg-bg-secondary rounded-2xl mb-4 animate-pulse" />

        <div className="bg-bg-card rounded-2xl p-4 mb-4 animate-pulse border border-border-light">
          <div className="h-10 bg-bg-secondary rounded-xl mb-3" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-bg-secondary rounded-full" />
            <div className="h-8 w-32 bg-bg-secondary rounded-full" />
            <div className="h-8 w-20 bg-bg-secondary rounded-full" />
          </div>
        </div>

        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-card rounded-2xl p-4 mb-3 animate-pulse border border-border-light"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-bg-secondary flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-bg-secondary rounded w-2/3 mb-2" />
                <div className="h-3 bg-bg-secondary rounded w-1/2" />
              </div>
              <div className="h-6 w-12 bg-bg-secondary rounded-full" />
            </div>
            <div className="h-3 bg-bg-secondary rounded w-full mb-2" />
            <div className="h-3 bg-bg-secondary rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
