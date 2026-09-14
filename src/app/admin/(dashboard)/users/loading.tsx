export default function UsersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-muted/60" />
          <div className="h-4 w-52 rounded-md bg-muted/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-muted/50" />
          <div className="h-9 w-24 rounded-lg bg-muted/50" />
        </div>
      </div>

      <div className="h-10 w-full rounded-xl bg-muted/40" />

      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-muted" />
                <div className="h-2.5 w-44 rounded bg-muted/60" />
              </div>
            </div>
            <div className="h-5 w-16 rounded-full bg-muted/60" />
            <div className="h-5 w-16 rounded-full bg-muted/60" />
            <div className="h-8 w-16 rounded-lg bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
