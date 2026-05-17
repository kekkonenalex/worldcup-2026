export default function LeaderboardLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-12 bg-bg-card rounded mb-4" />
        <div className="h-12 w-72 bg-bg-card rounded mb-2" />
        <div className="h-3 w-80 bg-bg-card rounded" />
      </div>

      <div className="max-w-3xl space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-card border border-border-subtle bg-bg-card px-4 py-3">
            <div className="w-6 h-4 bg-bg-elevated rounded shrink-0" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated shrink-0" />
            <div className="flex-1 h-4 bg-bg-elevated rounded max-w-[160px]" />
            <div className="ml-auto flex items-center gap-3">
              <div className="h-5 w-10 bg-bg-elevated rounded" />
              <div className="h-7 w-20 bg-bg-elevated rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
