export default function AwardsLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-28 bg-bg-card rounded mb-4" />
        <div className="h-10 w-64 bg-bg-card rounded mb-1" />
        <div className="h-3 w-80 bg-bg-card rounded" />
      </div>

      {/* Award input fields */}
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border-subtle bg-bg-card p-4">
            <div className="h-3 w-32 bg-bg-elevated rounded mb-2" />
            <div className="h-10 w-full bg-bg-elevated rounded" />
          </div>
        ))}
        <div className="h-10 w-36 bg-bg-elevated rounded-lg mt-2" />
      </div>
    </div>
  )
}
