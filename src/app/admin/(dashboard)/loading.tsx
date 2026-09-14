export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-lg bg-muted/60" />
        <div className="h-4 w-64 rounded-md bg-muted/40" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="size-7 rounded-lg bg-muted" />
            </div>
            <div className="h-7 w-14 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-72 rounded-xl border border-border/50 bg-card p-6" />
        <div className="h-72 rounded-xl border border-border/50 bg-card p-6" />
      </div>

      {/* Activity table skeleton */}
      <div className="h-64 rounded-xl border border-border/50 bg-card p-6" />
    </div>
  );
}
