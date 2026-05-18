export default function ReviewLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-32 bg-bg-card rounded mb-4" />
        <div className="h-10 w-64 bg-bg-card rounded mb-1" />
        <div className="h-3 w-80 bg-bg-card rounded" />
      </div>

      {/* 12 group standings cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border-subtle bg-bg-card p-4">
            <div className="h-4 w-16 bg-bg-elevated rounded mb-3" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 mb-2">
                <div className="h-4 w-4 bg-bg-elevated rounded-full shrink-0" />
                <div className="flex-1 h-3 bg-bg-elevated rounded" />
                <div className="h-3 w-6 bg-bg-elevated rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
