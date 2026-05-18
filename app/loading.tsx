export default function HomeLoading() {
  return (
    <div className="pb-16 animate-pulse">
      {/* Hero */}
      <section className="py-16 md:py-24 text-center max-w-3xl mx-auto">
        <div className="h-16 w-3/4 bg-bg-card rounded mx-auto mb-4" />
        <div className="h-10 w-2/3 bg-bg-card rounded mx-auto mb-8" />
        <div className="h-4 w-96 bg-bg-card rounded mx-auto mb-4" />
        <div className="h-4 w-80 bg-bg-card rounded mx-auto mb-10" />
        <div className="flex items-center justify-center gap-4">
          <div className="h-11 w-40 bg-bg-card rounded-lg" />
          <div className="h-11 w-40 bg-bg-card rounded-lg" />
        </div>
      </section>

      {/* Quick-nav cards */}
      <section className="mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border-subtle bg-bg-card p-5">
              <div className="w-8 h-8 bg-bg-elevated rounded mb-3" />
              <div className="h-4 w-24 bg-bg-elevated rounded mb-2" />
              <div className="h-3 w-full bg-bg-elevated rounded mb-1" />
              <div className="h-3 w-5/6 bg-bg-elevated rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
