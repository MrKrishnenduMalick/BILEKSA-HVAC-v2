"use client";

import { CalendarClock, Gauge, Hourglass, Timer } from "lucide-react";
import { ServiceStatusBadge, UsageBar } from "@/components/badges";
import { AreaChart } from "@/components/charts";
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Stat,
} from "@/components/ui";
import { Meter } from "@/components/charts";
import { api } from "@/lib/api";
import { day } from "@/lib/format";
import type { Analytics, Usage } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export default function UsagePage() {
  const { data: u, error, loading, reload } = useLoad(() => api<Usage>("/api/usage"));
  const a = useLoad(() => api<Analytics>("/api/analytics?days=30"));
  if (loading) return <PageSkeleton />;
  if (error || !u) return <ErrorState message={error ?? "Could not load usage"} onRetry={reload} />;
  const limitText = u.limit_reached
    ? "Limit reached: new calls are forwarded to your direct line without the AI."
    : u.usage_percent >= 80
      ? "Approaching your limit."
      : "Within your limit.";
  return (
    <>
      <PageHeader
        title="Usage"
        subtitle="Included minutes are a hard limit. There are no automatic overage charges."
        action={
          <ButtonLink href="/app/packages" variant="secondary">
            Request an upgrade
          </ButtonLink>
        }
      />
      <Card className="mb-5">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <Meter percent={u.usage_percent} size={168} label="Minutes used">
            <div>
              <p className="num text-[34px] font-semibold leading-none text-frost">
                {u.usage_percent}%
              </p>
              <p className="mt-1 text-xs text-haze">of minutes used</p>
            </div>
          </Meter>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold text-frost">
                {u.package?.name ?? "No package"} · {u.included_minutes} minutes per period
              </p>
              <ServiceStatusBadge status={u.service_status} />
            </div>
            <div className="mt-5">
              <UsageBar percent={u.usage_percent} />
            </div>
            <p className="mt-3 text-sm text-mist">
              {u.usage_percent}% used. {limitText}
            </p>
            {u.renewal_overdue && (
              <div className="mt-4">
                <Alert tone="amber">
                  Your period reset date has passed and has not been renewed yet. Usage continues to
                  count against the current limit until BILEKSA renews it.
                </Alert>
              </div>
            )}
          </div>
        </div>
      </Card>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Included minutes" value={u.included_minutes} icon={Gauge} />
        <Stat label="Used minutes" value={u.used_minutes} icon={Timer} tone="ember" />
        <Stat label="Remaining minutes" value={u.remaining_minutes} icon={Hourglass} tone="leaf" />
        <Stat
          label="Reset date"
          value={day(u.reset_date)}
          icon={CalendarClock}
          tone="iris"
          hint={`Started ${day(u.period_start)}`}
        />
      </div>
      <Card>
        <CardHeader title="Minutes per day" subtitle="AI-answered minutes, last 30 days" />
        {a.data ? (
          <AreaChart
            data={a.data.series}
            series={[{ key: "minutes", label: "Minutes", color: "#f5a524" }]}
            height={220}
          />
        ) : (
          <div className="skeleton h-52 rounded-xl" />
        )}
      </Card>
      <p className="mt-6 text-sm text-haze">
        Only BILEKSA can change packages or limits. Calls forwarded without the AI never use
        minutes.
      </p>
    </>
  );
}
