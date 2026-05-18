export default function SupportLoading() {
  return (
    <div className="max-w-2xl mx-auto pb-16 pt-4 animate-pulse">
      <div className="h-3 w-12 bg-bg-card rounded mb-6" />
      <div className="h-8 w-32 bg-bg-card rounded mb-2" />
      <div className="h-3 w-56 bg-bg-card rounded mb-8" />

      {/* FAQ rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border-subtle bg-bg-card p-4">
            <div className="h-4 w-3/4 bg-bg-elevated rounded mb-2" />
            <div className="h-3 w-full bg-bg-elevated rounded mb-1" />
            <div className="h-3 w-5/6 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>

      {/* Contact section */}
      <div className="mt-8 rounded-card border border-border-subtle bg-bg-card p-5">
        <div className="h-5 w-36 bg-bg-elevated rounded mb-2" />
        <div className="h-3 w-48 bg-bg-elevated rounded" />
      </div>
    </div>
  )
}
