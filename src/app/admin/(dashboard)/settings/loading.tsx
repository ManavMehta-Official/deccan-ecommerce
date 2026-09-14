export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-muted/60" />
        <div className="h-4 w-72 rounded-md bg-muted/40" />
      </div>

      <div className="space-y-6">
        <div className="h-64 rounded-xl border border-border/50 bg-card p-6" />
        <div className="h-48 rounded-xl border border-border/50 bg-card p-6" />
        <div className="h-48 rounded-xl border border-border/50 bg-card p-6" />
      </div>
    </div>
  );
}
