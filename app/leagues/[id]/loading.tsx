export default function LeagueDetailLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-20 bg-bg-card rounded mb-4" />
        <div className="h-10 w-64 bg-bg-card rounded mb-1" />
        <div className="h-3 w-32 bg-bg-card rounded" />
      </div>

      {/* Member grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border-subtle bg-bg-card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bg-elevated shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-28 bg-bg-elevated rounded mb-1" />
              <div className="h-3 w-20 bg-bg-elevated rounded" />
            </div>
            <div className="h-6 w-16 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>

      {/* League standings heading */}
      <div className="h-7 w-48 bg-bg-card rounded mb-2" />
      <div className="h-3 w-64 bg-bg-card rounded mb-4" />

      {/* Leaderboard rows */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-card border border-border-subtle bg-bg-card px-4 py-3">
            <div className="w-6 h-4 bg-bg-elevated rounded shrink-0" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated shrink-0" />
            <div className="flex-1 h-4 bg-bg-elevated rounded max-w-[140px]" />
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
