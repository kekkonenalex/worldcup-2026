export default function LeaguesLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-12 bg-bg-card rounded mb-4" />
        <div className="h-12 w-48 bg-bg-card rounded mb-2" />
        <div className="h-3 w-96 bg-bg-card rounded mb-1" />
        <div className="h-3 w-80 bg-bg-card rounded" />
      </div>

      {/* League cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border-subtle bg-bg-card px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-40 bg-bg-elevated rounded" />
              <div className="h-5 w-20 bg-bg-elevated rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3 w-24 bg-bg-elevated rounded" />
              <div className="h-3 w-28 bg-bg-elevated rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Create / join form area */}
      <div className="mt-8 rounded-card border border-border-subtle bg-bg-card p-5">
        <div className="h-5 w-32 bg-bg-elevated rounded mb-3" />
        <div className="h-10 w-full bg-bg-elevated rounded mb-2" />
        <div className="h-9 w-28 bg-bg-elevated rounded-lg" />
      </div>
    </div>
  )
}
