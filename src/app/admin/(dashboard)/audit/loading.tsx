export default function AuditLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-muted/60" />
        <div className="h-4 w-60 rounded-md bg-muted/40" />
      </div>

      <div className="h-10 w-full rounded-xl bg-muted/40" />

      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
            <div className="h-3 w-28 rounded bg-muted/60" />
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted/70" />
            <div className="h-5 w-16 rounded-full bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
