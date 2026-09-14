'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Download, Trash2, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { bulkDeleteUsersAction } from '@/app/admin/actions';

type UserTableToolbarProps = {
  selectedUserIds: string[];
  onClearSelection: () => void;
  exportUrl: string;
};

export function UserTableToolbar({
  selectedUserIds,
  onClearSelection,
  exportUrl,
}: UserTableToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get('query') || '';
  const currentRole = searchParams.get('role') || 'all';
  const currentStatus = searchParams.get('status') || 'all';

  const [query, setQuery] = React.useState(currentQuery);
  const [isDeletingBulk, setIsDeletingBulk] = React.useState(false);

  const updateFilters = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.set('page', '1');
      router.push(`/admin/users?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ query: query.trim() || null });
  };

  const handleRoleChange = (role: string | null) => {
    updateFilters({ role: role || null });
  };

  const handleStatusChange = (status: string | null) => {
    updateFilters({ status: status || null });
  };


  const handleClearAllFilters = () => {
    setQuery('');
    router.push('/admin/users');
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    const confirm = window.confirm(
      `Are you sure you want to delete ${selectedUserIds.length} selected user(s)?`
    );
    if (!confirm) return;

    setIsDeletingBulk(true);
    try {
      const res = await bulkDeleteUsersAction(selectedUserIds);
      if (res.success) {
        toast.success(`Successfully deleted ${res.count ?? selectedUserIds.length} user(s)`);
        onClearSelection();
      } else {
        toast.error(res.error || 'Failed to delete users');
      }
    } catch {
      toast.error('An unexpected error occurred during bulk deletion');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const hasActiveFilters = currentQuery || currentRole !== 'all' || currentStatus !== 'all';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Filters */}
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 h-9 text-xs"
            />
          </form>

          <div className="flex items-center gap-2">
            <Select value={currentRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                <SelectItem value="user" className="text-xs">Users</SelectItem>
                <SelectItem value="admin" className="text-xs">Admins</SelectItem>
                <SelectItem value="superadmin" className="text-xs">Superadmins</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="verified" className="text-xs">Verified</SelectItem>
                <SelectItem value="unverified" className="text-xs">Unverified</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Global actions & Export */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <a
            href={exportUrl}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar if items selected */}
      {selectedUserIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs transition-all animate-in fade-in">
          <span className="font-semibold text-primary">
            {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeletingBulk}
              onClick={handleBulkDelete}
              className="h-8 text-xs gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {isDeletingBulk ? 'Deleting...' : 'Delete Selected'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
