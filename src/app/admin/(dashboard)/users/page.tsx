import { getPaginatedUsers } from '@/db/queries';
import { AddUserDialog } from '@/components/admin/addUserDialog';
import { ImportUsersDialog } from '@/components/admin/importUserDialog';
import { InviteUserDialog } from '@/components/admin/inviteUserDialog';
import { UserTable } from '@/components/admin/userTable';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pageValue = typeof params.page === 'string' ? Number(params.page) : 1;
  const queryValue = typeof params.query === 'string' ? params.query : undefined;
  const roleValue = typeof params.role === 'string' ? params.role : undefined;
  const statusValue = typeof params.status === 'string' ? params.status : undefined;

  const result = await getPaginatedUsers({
    page: Number.isFinite(pageValue) ? pageValue : 1,
    pageSize: 10,
    query: queryValue,
    role: roleValue,
    status: statusValue,
  });

  const exportParams = new URLSearchParams();
  if (queryValue) exportParams.set('query', queryValue);
  if (roleValue && roleValue !== 'all') exportParams.set('role', roleValue);
  if (statusValue && statusValue !== 'all') exportParams.set('status', statusValue);
  const exportUrl = `/admin/users/export?${exportParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage user directory, invitations, roles, and account statuses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ImportUsersDialog />
          <InviteUserDialog />
          <AddUserDialog />
        </div>
      </div>

      <UserTable
        users={result.users}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        exportUrl={exportUrl}
      />
    </div>
  );
}