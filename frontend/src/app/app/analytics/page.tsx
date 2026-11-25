"use client";

import { CalendarCheck, Clock, Inbox, PhoneIncoming, Percent, Siren } from "lucide-react";
import { useState } from "react";
import { AreaChart, BarChart, Donut, Legend } from "@/components/charts";
import {
  Card,
  CardHeader,
  Empty,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Segmented,
  Stat,
} from "@/components/ui";
import { api } from "@/lib/api";
import { duration, label } from "@/lib/format";
import { delta, type Analytics } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const PALETTE = [
  "#2dd4bf",
  "#8b93ff",
  "#60a5fa",
  "#c084fc",
  "#f5a524",
  "#34d399",
  "#f472b6",
  "#94a3b8",
];
const URGENCY_COLORS: Record<string, string> = {
  emergency: "#ff5c7a",
  urgent: "#f5a524",
  soon: "#8b93ff",
  normal: "#2dd4bf",
};

const hourLabel = (h: number) =>
  h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;

export default function AnalyticsPage() {
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const {
    data: a,
    error,
    loading,
    reload,
  } = useLoad(() => api<Analytics>(`/api/analytics?days=${days}`), [days]);

  return (
    <>
      <PageHeader
        title="Call analytics"
        subtitle="How your AI receptionist is performing. Every figure is counted from real calls and leads."
        action={
          <Segmented
            label="Period"
            value={days}
            onChange={setDays}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
        }
      />
      {loading ? (
        <PageSkeleton />
      ) : error || !a ? (
        <ErrorState message={error ?? "Could not load analytics"} onRetry={reload} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="Calls"
              value={a.totals.calls}
              icon={PhoneIncoming}
              delta={delta(a.totals.calls, a.previous.calls)}
              hint="vs previous period"
            />
            <Stat
              label="Answer rate"
              value={a.totals.answer_rate == null ? "—" : `${a.totals.answer_rate}%`}
              icon={Percent}
              tone="leaf"
              hint="handled by the AI"
            />
            <Stat
              label="Leads"
              value={a.totals.leads}
              icon={Inbox}
              tone="iris"
              delta={delta(a.totals.leads, a.previous.leads)}
            />
            <Stat
              label="Appointments"
              value={a.totals.appointments}
              icon={CalendarCheck}
              tone="iris"
              hint="requested"
            />
            <Stat label="Emergencies" value={a.totals.urgent} icon={Siren} tone="signal" />
            <Stat
              label="Average call"
              value={duration(a.totals.avg_call_seconds)}
              icon={Clock}
              tone="ember"
              hint={`${a.totals.minutes} minutes in total`}
            />
          </div>

          <Card className="mb-5">
            <CardHeader
              title="Daily call volume"
              subtitle={`Last ${a.days} days, in your time zone (${a.timezone.replace("_", " ")})`}
              action={
                <Legend
                  series={[
                    { key: "calls", label: "All calls", color: "#2dd4bf" },
                    { key: "answered", label: "Answered by AI", color: "#8b93ff" },
                    { key: "urgent", label: "Emergencies", color: "#ff5c7a" },
                  ]}
                />
              }
            />
            <AreaChart
              data={a.series}
              height={260}
              series={[
                { key: "calls", label: "All calls", color: "#2dd4bf" },
                { key: "answered", label: "Answered by AI", color: "#8b93ff" },
                { key: "urgent", label: "Emergencies", color: "#ff5c7a" },
              ]}
            />
          </Card>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="When people call" subtitle="Calls by hour of day" />
              <BarChart
                label="Calls by hour of day"
                data={a.by_hour.map((h) => ({
                  label: hourLabel(h.hour),
                  title: `${hourLabel(h.hour)}–${hourLabel((h.hour + 1) % 24)}`,
                  value: h.count,
                }))}
              />
            </Card>
            <Card>
              <CardHeader title="Requests by urgency" subtitle="Leads captured in this period" />
              {a.by_urgency.length ? (
                <Donut
                  centerLabel="leads"
                  parts={["emergency", "urgent", "soon", "normal"]
                    .map((k) => ({
                      label: label(k),
                      value: a.by_urgency.find((u) => u.key === k)?.count ?? 0,
                      color: URGENCY_COLORS[k],
                    }))
                    .filter((p) => p.value > 0)}
                />
              ) : (
                <Empty title="No leads in this period" />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="What callers need" subtitle="Leads by service type" />
              {a.by_service.length ? (
                <ul className="space-y-3">
                  {a.by_service.slice(0, 8).map((s, i) => {
                    const max = a.by_service[0].count || 1;
                    return (
                      <li key={s.key}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-mist">{label(s.key)}</span>
                          <span className="num font-semibold text-frost">{s.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(s.count / max) * 100}%`,
                              background: PALETTE[i % PALETTE.length],
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty title="No leads in this period" />
              )}
            </Card>
            <Card>
              <CardHeader title="How calls ended" subtitle="Outcome of every call" />
              {a.by_outcome.length ? (
                <Donut
                  centerLabel="calls"
                  parts={a.by_outcome.map((o, i) => ({
                    label: label(o.key),
                    value: o.count,
                    color: o.key === "failed" ? "#ff5c7a" : PALETTE[i % PALETTE.length],
                  }))}
                />
              ) : (
                <Empty title="No calls in this period" />
              )}
              {a.by_emergency.length > 0 && (
                <div className="mt-6 border-t border-white/[0.07] pt-4">
                  <p className="mb-2 text-xs text-haze">Emergencies by type</p>
                  <div className="flex flex-wrap gap-2">
                    {a.by_emergency.map((e) => (
                      <span
                        key={e.key}
                        className="rounded-full bg-signal/10 px-3 py-1 text-xs font-semibold text-[#ffa3b5] ring-1 ring-signal/25"
                      >
                        {label(e.key)}: {e.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
