'use client';

import * as React from 'react';
import { Search, User, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type GlobalSearchProps = {
  initialUsers?: UserRecord[];
};

export function GlobalSearch({ initialUsers = [] }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full max-w-sm h-9 px-3 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground transition-colors hover:bg-muted/80 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate hidden sm:inline">Search users, pages or actions...</span>
          <span className="truncate sm:hidden">Search...</span>
        </div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>


      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search users by name or email, or navigate pages..." />
          <CommandList>
            <CommandEmpty>No matching users or pages found.</CommandEmpty>
            
            <CommandGroup heading="Pages">
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/users'))}>
                <FileText className="mr-2 size-4 text-muted-foreground" />
                <span>User Management</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/settings'))}>
                <FileText className="mr-2 size-4 text-muted-foreground" />
                <span>System Settings</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/admin/audit'))}>
                <FileText className="mr-2 size-4 text-muted-foreground" />
                <span>Audit Log</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Users">
              {initialUsers.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.name} ${u.email} ${u.role}`}
                  onSelect={() => runCommand(() => router.push('/admin/users'))}
                >
                  <User className="mr-2 size-4 text-muted-foreground" />
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">{u.name || 'Unnamed User'}</span>
                    <span className="text-xs text-muted-foreground truncate">{u.email} • Role: {u.role}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}