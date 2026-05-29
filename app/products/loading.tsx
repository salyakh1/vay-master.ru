export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-bg-primary pb-20 pt-2">
      <div className="max-w-2xl mx-auto px-4">
        <div className="h-[200px] bg-bg-secondary rounded-2xl mb-4 animate-pulse" />

        <div className="h-12 bg-bg-secondary rounded-xl mb-4 animate-pulse" />

        <div className="flex gap-2 overflow-hidden mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 bg-bg-secondary rounded-full flex-shrink-0 animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-card rounded-xl overflow-hidden animate-pulse border border-border-light"
            >
              <div className="h-40 bg-bg-secondary" />
              <div className="p-3">
                <div className="h-4 bg-bg-secondary rounded mb-2" />
                <div className="h-3 bg-bg-secondary rounded w-2/3 mb-2" />
                <div className="h-5 bg-bg-secondary rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
