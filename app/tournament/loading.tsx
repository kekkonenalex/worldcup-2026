export default function TournamentLoading() {
  return (
    <div className="pb-16 animate-pulse">
      {/* Hero */}
      <div className="mb-10">
        <div className="h-14 w-80 bg-bg-card rounded mb-2" />
        <div className="h-3 w-96 bg-bg-card rounded" />
      </div>

      {/* Group Stage heading */}
      <div className="h-5 w-32 bg-bg-card rounded mb-4" />

      {/* 12 group cards in responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
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

      {/* Knockout Phase heading */}
      <div className="h-5 w-40 bg-bg-card rounded mb-4" />

      {/* Knockout match cards placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border-subtle bg-bg-card p-4">
            <div className="h-3 w-20 bg-bg-elevated rounded mb-3" />
            <div className="flex justify-between items-center gap-2">
              <div className="h-5 w-24 bg-bg-elevated rounded" />
              <div className="h-5 w-10 bg-bg-elevated rounded" />
              <div className="h-5 w-24 bg-bg-elevated rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Golden Boot heading */}
      <div className="h-5 w-36 bg-bg-card rounded mb-4" />

      {/* Golden Boot card */}
      <div className="rounded-card border border-border-subtle bg-bg-card p-4 mb-12">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 bg-bg-elevated rounded shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-28 bg-bg-elevated rounded mb-2" />
            <div className="h-3 w-56 bg-bg-elevated rounded" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-t border-border-subtle first:border-t-0">
            <div className="w-6 h-5 bg-bg-elevated rounded shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-36 bg-bg-elevated rounded mb-1" />
              <div className="h-3 w-20 bg-bg-elevated rounded" />
            </div>
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <div className="h-4 w-6 bg-bg-elevated rounded mb-1 mx-auto" />
                <div className="h-3 w-8 bg-bg-elevated rounded" />
              </div>
              <div className="text-center">
                <div className="h-4 w-6 bg-bg-elevated rounded mb-1 mx-auto" />
                <div className="h-3 w-10 bg-bg-elevated rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
