export default function RulesLoading() {
  return (
    <div className="max-w-2xl mx-auto pb-16 pt-4 animate-pulse">
      <div className="h-3 w-12 bg-bg-card rounded mb-6" />
      <div className="h-8 w-40 bg-bg-card rounded mb-2" />
      <div className="h-3 w-64 bg-bg-card rounded mb-10" />

      {/* Numbered section blocks */}
      {Array.from({ length: 4 }).map((_, s) => (
        <div key={s} className="mb-8">
          <div className="w-10 h-10 rounded-full bg-bg-card mb-4" />
          <div className="h-5 w-40 bg-bg-card rounded mb-4" />
          <div className="space-y-2 pl-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-bg-card shrink-0" />
                <div className="flex-1 h-3 bg-bg-card rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Points table */}
      <div className="rounded-card border border-border-subtle bg-bg-card p-4 space-y-2">
        <div className="h-4 w-32 bg-bg-elevated rounded mb-3" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="h-3 w-40 bg-bg-elevated rounded" />
            <div className="h-3 w-8 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
