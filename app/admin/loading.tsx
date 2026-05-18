export default function AdminLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-6">
        <div className="h-10 w-72 bg-bg-card rounded mb-1" />
        <div className="h-3 w-96 bg-bg-card rounded" />
      </div>

      {/* Match rows */}
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card border border-border-subtle bg-bg-card px-4 py-3">
            <div className="h-3 w-6 bg-bg-elevated rounded shrink-0" />
            <div className="h-4 w-24 bg-bg-elevated rounded shrink-0" />
            <div className="flex-1 h-4 bg-bg-elevated rounded max-w-[140px]" />
            <div className="h-8 w-10 bg-bg-elevated rounded mx-1" />
            <div className="h-3 w-4 bg-bg-elevated rounded" />
            <div className="h-8 w-10 bg-bg-elevated rounded mx-1" />
            <div className="flex-1 h-4 bg-bg-elevated rounded max-w-[140px]" />
            <div className="h-7 w-16 bg-bg-elevated rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
