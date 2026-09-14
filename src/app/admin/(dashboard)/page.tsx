import Link from 'next/link';
import { getDashboardSummary, getDashboardAnalytics } from '@/db/queries';
import { Badge } from '@/components/ui/badge';
import { DashboardCharts } from '@/components/admin/dashboardCharts';
import { 
  Users, 
  ShieldCheck, 
  Activity, 
  Mail, 
  ArrowUpRight, 
  Clock,
  ShieldAlert
} from 'lucide-react';

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function outcomeBadge(outcome: string) {
  if (outcome === 'success') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  if (outcome === 'blocked') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  return 'border-destructive/20 bg-destructive/10 text-destructive';
}

export default async function AdminDashboard() {
  const [summary, analytics] = await Promise.all([
    getDashboardSummary(),
    getDashboardAnalytics(),
  ]);

  const statCards = [
    {
      label: 'Directory Users',
      value: summary.userCount,
      href: '/admin/users',
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10',
      description: 'Registered accounts',
    },
    {
      label: 'Administrators',
      value: summary.adminCount,
      href: '/admin/users',
      icon: ShieldCheck,
      color: 'text-purple-500 bg-purple-500/10',
      description: 'Admins & superadmins',
    },
    {
      label: 'Audit Events',
      value: summary.auditCount,
      href: '/admin/audit',
      icon: Activity,
      color: 'text-emerald-500 bg-emerald-500/10',
      description: 'Logged actions',
    },
    {
      label: 'Email Delivery',
      value: summary.emailEnabled ? 'Enabled' : 'Console',
      href: '/admin/settings',
      icon: Mail,
      color: summary.emailEnabled
        ? 'text-emerald-500 bg-emerald-500/10'
        : 'text-amber-500 bg-amber-500/10',
      description: summary.emailProvider === 'resend' ? 'Resend configured' : 'Dev console fallback',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            System metrics, user growth, and privileged security activity.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative rounded-xl border border-border/60 bg-card p-5 transition-all hover:bg-muted/40 hover:border-border shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={`flex size-8 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{card.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Interactive Charts & Breakdown */}
      <DashboardCharts data={analytics} />

      {/* Recent Security & Account Activity */}
      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-2xs">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-semibold text-foreground text-sm sm:text-base">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">
              Latest security, user mutation, and authentication events.
            </p>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            View full audit log
            <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {summary.recentEvents.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No recent activity recorded.
            </p>
          ) : (
            summary.recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 transition-colors hover:bg-muted/20 px-2 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold capitalize text-foreground">
                      {event.action.replaceAll('_', ' ')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      By <span className="font-medium text-foreground/80">{event.actorName || 'System / Unknown'}</span>
                      {event.targetType && (
                        <> • Target: <span className="font-mono text-[10px]">{event.targetType}</span></>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground/60" />
                    {formatDate(event.createdAt)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`capitalize text-[10px] px-2 py-0.5 ${outcomeBadge(event.outcome)}`}
                  >
                    {event.outcome}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}