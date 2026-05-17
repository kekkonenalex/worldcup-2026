export default function UserProfileLoading() {
  return (
    <div className="pb-16 max-w-3xl animate-pulse">
      {/* Back link */}
      <div className="h-3 w-24 bg-bg-card rounded" />

      {/* Heading */}
      <div className="mt-3 mb-6">
        <div className="h-10 w-72 bg-bg-card rounded mb-2" />
        <div className="h-3 w-32 bg-bg-card rounded" />
      </div>

      {/* Score breakdown card */}
      <div className="rounded-card border border-border-subtle bg-bg-card p-5 mb-6">
        <div className="flex items-baseline gap-3 mb-4">
          <div className="h-10 w-16 bg-bg-elevated rounded" />
          <div className="h-3 w-20 bg-bg-elevated rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border-subtle bg-bg-elevated px-4 py-3">
              <div className="h-2 w-16 bg-bg-card rounded mb-2" />
              <div className="h-6 w-10 bg-bg-card rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Knockout picks highlight */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-2 rounded-card border border-border-subtle bg-bg-card p-4">
          <div className="h-2 w-32 bg-bg-elevated rounded mb-3" />
          <div className="h-8 w-40 bg-bg-elevated rounded" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-card border border-border-subtle bg-bg-card p-4 flex-1">
            <div className="h-2 w-20 bg-bg-elevated rounded mb-2" />
            <div className="h-4 w-24 bg-bg-elevated rounded" />
          </div>
          <div className="rounded-card border border-border-subtle bg-bg-card p-4 flex-1">
            <div className="h-2 w-24 bg-bg-elevated rounded mb-2" />
            <div className="h-4 w-20 bg-bg-elevated rounded" />
          </div>
        </div>
      </div>

      {/* Predictions section */}
      <div className="h-8 w-48 bg-bg-card rounded mb-4" />
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="rounded-card border border-border-subtle bg-bg-card mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="h-4 w-24 bg-bg-elevated rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, m) => (
            <div key={m} className="px-4 py-3 flex items-center gap-3 border-b border-border-subtle last:border-b-0">
              <div className="flex-1 h-3 bg-bg-elevated rounded" />
              <div className="h-5 w-12 bg-bg-elevated rounded" />
              <div className="flex-1 h-3 bg-bg-elevated rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
