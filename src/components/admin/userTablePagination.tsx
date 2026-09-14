'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UserTablePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export function UserTablePagination({
  page,
  totalPages,
  total,
  pageSize,
}: UserTablePaginationProps) {
  const searchParams = useSearchParams();

  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(targetPage));
    return `/admin/users?${params.toString()}`;
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground pt-1">
      <div>
        Showing <span className="font-semibold text-foreground">{startRecord}</span> to{' '}
        <span className="font-semibold text-foreground">{endRecord}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span> users
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <span className="mr-2 text-xs">
          Page {page} of {totalPages}
        </span>

        {page > 1 ? (
          <Link
            href={getPageUrl(page - 1)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </Link>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-8 text-xs gap-1 opacity-50"
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </Button>
        )}

        {page < totalPages ? (
          <Link
            href={getPageUrl(page + 1)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Next
            <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-8 text-xs gap-1 opacity-50"
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
