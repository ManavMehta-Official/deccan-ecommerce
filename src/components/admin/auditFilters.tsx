'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, RotateCcw, ChevronDown } from 'lucide-react';

const actions = [
  ['login_success', 'Login success'],
  ['login_failure', 'Login failure'],
  ['login_rate_limited', 'Login blocked'],
  ['logout', 'Logout'],
  ['setup_success', 'Setup success'],
  ['setup_failure', 'Setup failure'],
  ['setup_rate_limited', 'Setup blocked'],
  ['user_created', 'User created'],
  ['user_updated', 'User updated'],
  ['user_role_changed', 'Role changed'],
  ['users_imported', 'Users imported'],
  ['user_deleted', 'User deleted'],
  ['audit_exported', 'Audit exported'],
  ['audit_retention_cleanup', 'Retention cleanup'],
  ['invitation_created', 'Invitation created'],
  ['invitation_accepted', 'Invitation accepted'],
  ['password_reset_requested', 'Reset requested'],
  ['password_reset_completed', 'Reset completed'],
  ['email_settings_updated', 'Email settings updated'],
  ['email_test_sent', 'Email test sent'],
] as const;

export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Safely extract parameter string values
  const queryVal = searchParams.get('query') ?? '';
  const actionVal = searchParams.get('action') ?? '';
  const outcomeVal = searchParams.get('outcome') ?? '';
  const fromVal = searchParams.get('from') ?? '';
  const toVal = searchParams.get('to') ?? '';

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string' && value) params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      action={submit}
      className="rounded-lg border border-border/80 bg-card p-3.5 shadow-2xs space-y-3"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={`query-${queryVal}`}
            name="query"
            defaultValue={queryVal}
            placeholder="Search logs or users..."
            aria-label="Search events"
            className="h-8.5 pl-8 text-xs rounded-md border-input bg-background focus-visible:ring-1"
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <select
            key={`action-${actionVal}`}
            name="action"
            defaultValue={actionVal}
            className="h-8.5 w-full appearance-none rounded-md border border-input bg-background pl-2.5 pr-8 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All actions</option>
            {actions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Outcome Filter */}
        <div className="relative">
          <select
            key={`outcome-${outcomeVal}`}
            name="outcome"
            defaultValue={outcomeVal}
            className="h-8.5 w-full appearance-none rounded-md border border-input bg-background pl-2.5 pr-8 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="blocked">Blocked</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Date From */}
        <Input
          key={`from-${fromVal}`}
          name="from"
          type="date"
          defaultValue={fromVal}
          aria-label="Events from date"
          className="h-8.5 text-xs rounded-md border-input bg-background cursor-pointer focus-visible:ring-1"
        />

        {/* Date To */}
        <Input
          key={`to-${toVal}`}
          name="to"
          type="date"
          defaultValue={toVal}
          aria-label="Events to date"
          className="h-8.5 text-xs rounded-md border-input bg-background cursor-pointer focus-visible:ring-1"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
        <span className="text-[11px] text-muted-foreground font-medium">
          Filter audit trail records
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="h-7 px-2.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-7 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground shadow-2xs gap-1.5 cursor-pointer"
          >
            <Filter className="size-3" />
            Apply
          </Button>
        </div>
      </div>
    </form>
  );
}