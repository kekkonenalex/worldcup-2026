export default function LoginLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-pulse">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-6 w-48 bg-bg-card rounded mx-auto mb-2" />
          <div className="h-8 w-24 bg-bg-card rounded mx-auto mb-1" />
          <div className="h-3 w-20 bg-bg-card rounded mx-auto" />
        </div>

        <div className="bg-bg-card border border-border-subtle rounded-card p-6 space-y-4">
          <div>
            <div className="h-3 w-12 bg-bg-elevated rounded mb-2" />
            <div className="h-10 w-full bg-bg-elevated rounded" />
          </div>
          <div>
            <div className="h-3 w-16 bg-bg-elevated rounded mb-2" />
            <div className="h-10 w-full bg-bg-elevated rounded" />
          </div>
          <div className="h-10 w-full bg-bg-elevated rounded-lg" />

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border-subtle" />
            <div className="h-3 w-4 bg-bg-elevated rounded" />
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <div className="h-3 w-48 bg-bg-elevated rounded mb-1" />
          <div className="h-3 w-56 bg-bg-elevated rounded mb-3" />
          <div className="h-10 w-full bg-bg-elevated rounded" />
          <div className="h-10 w-full bg-bg-elevated rounded" />
        </div>
      </div>
    </div>
  )
}
