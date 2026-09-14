import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Server, Mail, ShieldCheck } from 'lucide-react';

type SystemHealthProps = {
  emailProvider: string;
  emailEnabled: boolean;
};

export function SystemHealthCard({ emailProvider, emailEnabled }: SystemHealthProps) {
const nodeEnv = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow-2xs">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black border border-emerald-500/15 shadow-2xs shrink-0">
            <Activity className="size-4 text-black" />
          </div>
          <div className="flex flex-col">
            System Health & Environment
            <span className="text-xs font-normal text-muted-foreground">
              Runtime infrastructure, database status, and operational configuration.
            </span>
          </div>
        </CardTitle>
        <CardDescription className="text-xs">
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Database className="size-3.5 text-emerald-500" />
                PostgreSQL
              </span>
              <span className="size-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Connected</p>
            <p className="text-[10px] text-muted-foreground">Drizzle ORM Pooling</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Server className="size-3.5 text-blue-500" />
                Environment
              </span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 uppercase">
                {nodeEnv}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">Next.js 16 App Router</p>
            <p className="text-[10px] text-muted-foreground">React 19 Server Components</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-purple-500" />
                Email Service
              </span>
              <span className={`size-2 rounded-full ${emailEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-sm font-semibold text-foreground capitalize">{emailProvider}</p>
            <p className="text-[10px] text-muted-foreground">
              {emailEnabled ? 'Live Delivery Active' : 'Console / Dev Fallback'}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-indigo-500" />
                Auth Engine
              </span>
              <span className="size-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Hashed Sessions</p>
            <p className="text-[10px] text-muted-foreground">DB Throttling & Rate Limits</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
