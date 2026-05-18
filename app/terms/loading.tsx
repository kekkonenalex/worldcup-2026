export default function TermsLoading() {
  return (
    <div className="max-w-2xl mx-auto pb-16 pt-4 animate-pulse">
      <div className="h-3 w-12 bg-bg-card rounded mb-6" />
      <div className="h-8 w-48 bg-bg-card rounded mb-2" />
      <div className="h-3 w-32 bg-bg-card rounded mb-8" />

      {Array.from({ length: 6 }).map((_, s) => (
        <div key={s} className="border-t border-border-subtle pt-6 pb-2">
          <div className="h-3 w-24 bg-bg-card rounded mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-bg-card rounded" />
            <div className="h-3 w-5/6 bg-bg-card rounded" />
            <div className="h-3 w-3/4 bg-bg-card rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
