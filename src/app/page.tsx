// app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, BookOpen, GitCommit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from "../../public/logo.svg";

export default function Home() {
  return (
    <div className="flex h-screen flex-col justify-between bg-background p-6 text-foreground">
      {/* Top Bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-white p-1 rounded-lg border border-border/40 shadow-2xs">
            <Image src={logo} alt="Deccan Logo" width={28} height={28} className="size-5" />
          </div>
          <span className="text-base font-black tracking-tight">Deccan</span>
        </div>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium gap-2">
            <GitCommit className="size-3.5" />
            GitHub
          </Button>
        </a>
      </header>

      {/* Hero Content */}
      <main className="mx-auto flex max-w-xl flex-col items-center text-center">

        <div className="mb-8">
          <div className="bg-white p-4 rounded-3xl border border-border/40 shadow-2xs">
            <Image src={logo} alt="Deccan Logo" width={28} height={28} className="size-15" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Admin infrastructure,<br /> ready out of the box.
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
          Pre-built authentication, session controls, and system diagnostics styled with clean, modern components.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link href="/docs">
            <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium rounded-lg">
              <BookOpen className="size-3.5 mr-1" />
              Documentation
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button size="sm" className="h-9 px-4 text-xs font-medium rounded-lg bg-blue-500 hover:bg-blue-500/90 text-white shadow-xs">
              Admin Dashboard
              <ArrowUpRight className="ml-1.5 size-3.5" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="text-center text-[11px] text-muted-foreground/60">
        © {new Date().getFullYear()} Deccan
      </footer>
    </div>
  );
}