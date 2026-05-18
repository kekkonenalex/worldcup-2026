export default function AccountSetupLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-pulse">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="h-6 w-48 bg-bg-card rounded mx-auto" />
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-card p-6 space-y-4">
          <div className="h-6 w-40 bg-bg-elevated rounded mb-1" />
          <div className="h-3 w-72 bg-bg-elevated rounded" />
          <div>
            <div className="h-3 w-24 bg-bg-elevated rounded mb-2" />
            <div className="h-10 w-full bg-bg-elevated rounded" />
          </div>
          <div className="h-10 w-full bg-bg-elevated rounded-lg" />
        </div>
      </div>
    </div>
  )
}
