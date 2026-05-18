export default function KnockoutLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-28 bg-bg-card rounded mb-4" />
        <div className="h-10 w-56 bg-bg-card rounded mb-1" />
        <div className="h-3 w-96 bg-bg-card rounded mb-1" />
        <div className="h-3 w-80 bg-bg-card rounded" />
      </div>

      {/* Bracket rounds */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[16, 8, 4, 2, 1].map((count, col) => (
          <div key={col} className="flex flex-col justify-around gap-2 shrink-0" style={{ minWidth: 160 }}>
            <div className="h-3 w-20 bg-bg-card rounded mb-2" />
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-card border border-border-subtle bg-bg-card p-3">
                <div className="h-4 w-24 bg-bg-elevated rounded mb-2" />
                <div className="h-px bg-border-subtle mb-2" />
                <div className="h-4 w-20 bg-bg-elevated rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
