import { redirect } from 'next/navigation';
import { hasSuperAdmin, getAllUsers } from '@/db/queries';
import { AdminSidebar } from '@/components/admin/adminSidebar';
import { GlobalSearch } from '@/components/admin/globalSearch';
import { Breadcrumbs } from '@/components/admin/breadcrumbs';
import { ThemeToggle } from '@/components/themeToggle';
import { requireAdmin } from '@/lib/auth';
import { MobileNav } from '@/components/admin/mobileNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const superAdminExists = await hasSuperAdmin();
  const allowSetup = process.env.ALLOW_SETUP === 'true';

  if (!superAdminExists) {
    if (allowSetup) {
      redirect('/admin/setup');
    } else {
      redirect('/admin/login');
    }
  }

  const currentUser = await requireAdmin();
  const users = await getAllUsers();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar user={currentUser} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-background/85 px-4 lg:px-8 backdrop-blur-md">
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center min-w-0">
            <Breadcrumbs />
          </div>

          {/* Search & Quick Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-36 sm:w-64 md:w-72">
              <GlobalSearch initialUsers={users} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}