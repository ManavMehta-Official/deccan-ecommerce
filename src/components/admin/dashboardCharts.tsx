'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, CheckCircle2 } from 'lucide-react';

type AnalyticsData = {
  history: {
    date: string;
    label: string;
    signups: number;
    activity: number;
  }[];
  roleBreakdown: {
    users: number;
    admins: number;
    superadmins: number;
  };
  verification: {
    verified: number;
    unverified: number;
  };
};

export function DashboardCharts({ data }: { data: AnalyticsData }) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const maxVal = Math.max(
    ...data.history.map((d) => Math.max(d.signups, d.activity)),
    5
  );

  const totalUsers =
    data.roleBreakdown.users +
    data.roleBreakdown.admins +
    data.roleBreakdown.superadmins;

  const totalVerified = data.verification.verified + data.verification.unverified;
  const verifiedPercentage =
    totalVerified > 0
      ? Math.round((data.verification.verified / totalVerified) * 100)
      : 0;

  // Generate SVG smooth Bezier curve path
  const getSmoothPath = (key: 'activity' | 'signups', width = 1000, height = 200) => {
    if (!data.history.length) return '';
    const points = data.history.map((d, i) => {
      const x = (i / (data.history.length - 1)) * width;
      const y = height - (d[key] / maxVal) * (height - 20) - 10;
      return { x, y };
    });

    return points.reduce((acc, point, i, arr) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const prev = arr[i - 1];
      const cx1 = prev.x + (point.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (point.x - prev.x) / 2;
      const cy2 = point.y;
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${point.x},${point.y}`;
    }, '');
  };

  const activityPath = getSmoothPath('activity');
  const signupsPath = getSmoothPath('signups');
  const activityArea = `${activityPath} L 1000,200 L 0,200 Z`;
  const signupsArea = `${signupsPath} L 1000,200 L 0,200 Z`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 14-Day Activity & Growth Trend Chart */}
      <Card className="lg:col-span-2 rounded-2xl border border-border/60 bg-card text-card-foreground shadow-xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
                <TrendingUp className="size-4" />
              </div>
              14-Day Growth & Security Activity
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Daily trend of user onboarding and privileged security events.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-500 shadow-2xs" />
              <span className="text-muted-foreground text-xs">Audit Activity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
              <span className="text-muted-foreground text-xs">New Signups</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="relative h-56 w-full">
            {/* SVG Smooth Area Chart */}
            <svg
              viewBox="0 0 1000 200"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={200 * ratio}
                  x2="1000"
                  y2={200 * ratio}
                  stroke="currentColor"
                  strokeOpacity="0.06"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area Fills */}
              <path d={activityArea} fill="url(#blueGradient)" />
              <path d={signupsArea} fill="url(#emeraldGradient)" />

              {/* Stroke Lines */}
              <path d={activityPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
              <path d={signupsPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

              {/* Interactive Data Points */}
              {data.history.map((d, i) => {
                const x = (i / (data.history.length - 1)) * 1000;
                const yAct = 200 - (d.activity / maxVal) * 180 - 10;
                const ySign = 200 - (d.signups / maxVal) * 180 - 10;
                const isHovered = hoverIndex === i;

                return (
                  <g key={d.date}>
                    {/* Active vertical hover indicator line */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1="0"
                        x2={x}
                        y2="200"
                        stroke="currentColor"
                        strokeOpacity="0.2"
                        strokeDasharray="3 3"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={yAct}
                      r={isHovered ? "5" : "3.5"}
                      className={`transition-all duration-150 fill-background stroke-blue-500 ${isHovered ? 'stroke-3' : 'stroke-2'}`}
                    />
                    <circle
                      cx={x}
                      cy={ySign}
                      r={isHovered ? "5" : "3.5"}
                      className={`transition-all duration-150 fill-background stroke-emerald-500 ${isHovered ? 'stroke-3' : 'stroke-2'}`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Trigger Overlay & Tooltips */}
            <div className="absolute inset-0 flex items-end justify-between">
              {data.history.map((day, idx) => {
                const isHovered = hoverIndex === idx;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                    className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer z-10"
                  >
                    {/* Floating Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-30 whitespace-nowrap rounded-xl border border-border bg-popover/95 px-3 py-1.5 text-xs shadow-md text-popover-foreground backdrop-blur-xs pointer-events-none animate-in fade-in zoom-in-95">
                        <p className="font-semibold text-[11px] text-foreground">{day.label}</p>
                        <div className="flex gap-3 mt-0.5 text-[10px] font-medium">
                          <span className="text-blue-600 dark:text-blue-400">{day.activity} events</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{day.signups} signups</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-between pt-3 text-[10px] text-muted-foreground font-medium border-t border-border/30 mt-2">
            {data.history.map((day, idx) => (
              <span
                key={day.date}
                className={`text-center transition-colors ${hoverIndex === idx ? 'text-foreground font-semibold' : ''}`}
              >
                {idx % 2 === 0 ? day.label.split(' ')[1] : ''}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution & Breakdown Card */}
      <Card className="rounded-2xl border border-border/60 bg-card text-card-foreground shadow-xs flex flex-col justify-between">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
              <Users className="size-4" />
            </div>
            Directory Distribution
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Role hierarchy and account status.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {/* Roles Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Standard Users</span>
              <span className="font-semibold">{data.roleBreakdown.users}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden p-0.5">
              <div
                style={{
                  width: `${totalUsers > 0 ? (data.roleBreakdown.users / totalUsers) * 100 : 0}%`,
                }}
                className="h-full bg-zinc-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Administrators</span>
              <span className="font-semibold">{data.roleBreakdown.admins}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden p-0.5">
              <div
                style={{
                  width: `${totalUsers > 0 ? (data.roleBreakdown.admins / totalUsers) * 100 : 0}%`,
                }}
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Superadmins</span>
              <span className="font-semibold">{data.roleBreakdown.superadmins}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden p-0.5">
              <div
                style={{
                  width: `${totalUsers > 0 ? (data.roleBreakdown.superadmins / totalUsers) * 100 : 0}%`,
                }}
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Email Verification
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {verifiedPercentage}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden p-0.5">
              <div
                style={{ width: `${verifiedPercentage}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
              <span>{data.verification.verified} verified</span>
              <span>{data.verification.unverified} unverified</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}