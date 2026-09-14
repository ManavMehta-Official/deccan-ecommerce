'use client';

import * as React from 'react';
import Image from 'next/image';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { EditUserDialog } from '@/components/admin/editUserDialog';
import { DeleteUserDialog } from '@/components/admin/deleteUserDialog';
import { UserDetailsSheet } from '@/components/admin/userDetailsSheet';
import { UserTableToolbar } from '@/components/admin/userTableToolbar';
import { UserTablePagination } from '@/components/admin/userTablePagination';
import { deleteUserAction } from '@/app/admin/actions';
import { Eye, Users as UsersIcon } from 'lucide-react';

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserTableProps = {
  users: UserRow[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  exportUrl: string;
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

function getRoleBadgeStyles(role: string) {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'superadmin':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
  }
}

export function UserTable({
  users,
  page,
  totalPages,
  total,
  pageSize,
  exportUrl,
}: UserTableProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [inspectUser, setInspectUser] = React.useState<UserRow | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const allSelected = users.length > 0 && users.every((u) => selectedIds.includes(u.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const openInspector = (user: UserRow) => {
    setInspectUser(user);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <UserTableToolbar
        selectedUserIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        exportUrl={exportUrl}
      />

      <div className="rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-160">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="w-12 py-3.5 px-4 text-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="py-3.5 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  User
                </TableHead>
                <TableHead className="py-3.5 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Role
                </TableHead>
                <TableHead className="py-3.5 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="py-3.5 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Joined
                </TableHead>
                <TableHead className="py-3.5 px-4 text-right font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground text-sm font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UsersIcon className="size-8 text-muted-foreground/50" />
                      <p>No matching users found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <TableRow
                      key={user.id}
                      data-state={isSelected ? 'selected' : undefined}
                      className="transition-colors hover:bg-muted/30 group"
                    >
                      <TableCell className="py-3 px-4 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(user.id, Boolean(checked))}
                          aria-label={`Select ${user.name || user.email}`}
                        />
                      </TableCell>
                      <TableCell className="py-3 px-4 font-medium">
                        <div
                          onClick={() => openInspector(user)}
                          className="flex items-center gap-3 cursor-pointer group-hover:text-primary transition-colors"
                        >
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt=""
                              width={36}
                              height={36}
                              className="size-9 rounded-full object-cover shrink-0 ring-1 ring-border/50"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 ring-1 ring-primary/20">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div className="flex flex-col overflow-hidden max-w-55">
                            <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {user.name || 'Unnamed'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`capitalize font-medium text-[11px] px-2.5 py-0.5 rounded-full ${getRoleBadgeStyles(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            user.emailVerified
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              user.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground text-xs font-mono">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openInspector(user)}
                            className="size-8 text-muted-foreground hover:text-foreground"
                            title="View details"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <EditUserDialog user={user} />
                          <DeleteUserDialog user={user} action={deleteUserAction} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserTablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
      />

      <UserDetailsSheet
        user={inspectUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
