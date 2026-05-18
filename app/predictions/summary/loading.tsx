export default function SummaryLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-32 bg-bg-card rounded mb-4" />
        <div className="h-10 w-56 bg-bg-card rounded mb-1" />
      </div>

      {/* Completion status bar */}
      <div className="rounded-card border border-border-subtle bg-bg-card p-4 mb-6 flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1">
            <div className="h-3 w-16 bg-bg-elevated rounded mb-1" />
            <div className="h-5 w-10 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>

      {/* Group prediction cards */}
      {Array.from({ length: 4 }).map((_, g) => (
        <div key={g} className="rounded-card border border-border-subtle bg-bg-card mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="h-4 w-20 bg-bg-elevated rounded" />
            <div className="h-3 w-28 bg-bg-elevated rounded" />
          </div>
          {Array.from({ length: 5 }).map((_, m) => (
            <div key={m} className="px-4 py-3 flex items-center gap-3 border-b border-border-subtle last:border-b-0">
              <div className="flex-1 h-4 bg-bg-elevated rounded max-w-[120px]" />
              <div className="h-6 w-8 bg-bg-elevated rounded mx-1" />
              <div className="h-3 w-3 bg-bg-elevated rounded" />
              <div className="h-6 w-8 bg-bg-elevated rounded mx-1" />
              <div className="flex-1 h-4 bg-bg-elevated rounded max-w-[120px]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
