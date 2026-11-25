"use client";

import {
  ArrowUpRight,
  CalendarCheck,
  Inbox,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  Siren,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UrgencyBadge } from "@/components/badges";
import { CallDrawer } from "@/components/call-drawer";
import { CallsTable } from "@/components/calls-table";
import { AreaChart, Donut, Legend, Meter, Sparkline } from "@/components/charts";
import { useSession } from "@/components/session";
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  Empty,
  ErrorState,
  PageSkeleton,
  Stat,
} from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, day, label, phone } from "@/lib/format";
import { delta, type Analytics, type CallRow, type Lead, type Overview } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const OUTCOME_COLORS: Record<string, string> = {
  lead_captured: "#2dd4bf",
  callback_requested: "#8b93ff",
  appointment_requested: "#60a5fa",
  transfer: "#c084fc",
  answered: "#34d399",
  forwarded: "#f5a524",
  no_conversation: "#64748b",
  failed: "#ff5c7a",
  in_progress: "#94a3b8",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function OverviewPage() {
  const { me } = useSession();
  const overview = useLoad(() => api<Overview>("/api/dashboard/overview"));
  const analytics = useLoad(() => api<Analytics>("/api/analytics?days=30"));
  const open = useLoad(() => api<Lead[]>("/api/leads?callbacks=true&limit=50"));
  const [selected, setSelected] = useState<CallRow | null>(null);

  if (overview.loading) return <PageSkeleton />;
  if (overview.error || !overview.data)
    return (
      <ErrorState
        message={overview.error ?? "Could not load your dashboard"}
        onRetry={overview.reload}
      />
    );
  const { metrics: m, receptionist: r, usage: u } = overview.data;
  const a = analytics.data;
  const live = r.live;
  const paused = ["limit_reached", "suspended"].includes(r.service_status);
  const waiting = (open.data ?? []).filter((l) => l.callback_status === "requested");
  const spark = (key: "calls" | "leads" | "urgent" | "minutes") =>
    (a?.series ?? []).map((p) => Number(p[key] ?? 0));

  return (
    <>
      <header className="animate-rise mb-7">
        <p className="text-sm text-haze">
          {greeting()}, {me.business?.name}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.025em] text-frost sm:text-[32px]">
          Here&apos;s how your phones are doing
        </h1>
      </header>

      {u.limit_reached && (
        <div className="mb-6">
          <Alert>
            You have used all {u.included_minutes} included minutes. New calls are being forwarded
            to your direct line without the AI receptionist.{" "}
            <Link href="/app/packages" className="font-semibold underline">
              Request an upgrade
            </Link>
          </Alert>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="orb h-24 w-24 shrink-0"
              data-state={paused ? "alert" : live ? "live" : "idle"}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-mist">AI receptionist status</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-frost">
                {r.status_label}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-haze">Phone line</p>
                  <p className="font-medium text-frost">{label(r.phone_state)}</p>
                </div>
                <div>
                  <p className="text-xs text-haze">Package</p>
                  <p className="font-medium text-frost">{u.package?.name ?? "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-haze">Period resets</p>
                  <p className="font-medium text-frost">{day(u.reset_date)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-6">
            <Meter percent={u.usage_percent} label="Minutes used">
              <div>
                <p className="num text-2xl font-semibold text-frost">{u.usage_percent}%</p>
                <p className="text-[11px] text-haze">used</p>
              </div>
            </Meter>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-mist">Minutes this period</p>
              <p className="num mt-1 text-[28px] font-semibold leading-none text-frost">
                {u.used_minutes}
                <span className="text-base font-medium text-haze"> / {u.included_minutes}</span>
              </p>
              <p className="mt-2 text-sm text-mist">{u.remaining_minutes} minutes remaining</p>
              <Link
                href="/app/usage"
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline"
              >
                Usage details <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total calls"
          value={m.total_calls}
          icon={PhoneIncoming}
          hint={`${m.answered_calls} answered by AI`}
          delta={a ? delta(a.totals.calls, a.previous.calls) : null}
        >
          <Sparkline values={spark("calls")} />
        </Stat>
        <Stat
          label="Leads generated"
          value={m.leads_captured}
          icon={Inbox}
          tone="iris"
          hint="this period"
          delta={a ? delta(a.totals.leads, a.previous.leads) : null}
        >
          <Sparkline values={spark("leads")} color="#8b93ff" />
        </Stat>
        <Stat
          label="Emergency calls"
          value={m.urgent_calls}
          icon={Siren}
          tone="signal"
          hint="recorded and escalated"
        >
          <Sparkline values={spark("urgent")} color="#ff5c7a" />
        </Stat>
        <Stat
          label="Minutes used"
          value={m.minutes_used}
          icon={Timer}
          tone="ember"
          hint={`${m.included_minutes} included`}
        >
          <Sparkline values={spark("minutes")} color="#f5a524" />
        </Stat>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [PhoneCall, "Callback requests", m.callback_requests],
          [CalendarCheck, "Appointment requests", m.appointment_requests],
          [PhoneForwarded, "Human transfers", m.human_transfers],
          [Timer, "Minutes remaining", m.remaining_minutes],
        ].map(([Icon, k, v]) => {
          const I = Icon as typeof Timer;
          return (
            <div
              key={k as string}
              className="glass-inset flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <I size={16} className="text-haze" aria-hidden />
              <span className="text-[13px] text-mist">{k as string}</span>
              <span className="num ml-auto text-lg font-semibold text-frost">{v as number}</span>
            </div>
          );
        })}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Calls and leads, last 30 days"
            subtitle="Every call your receptionist handled, and the leads it captured"
            action={
              <Legend
                series={[
                  { key: "calls", label: "Calls", color: "#2dd4bf" },
                  { key: "leads", label: "Leads", color: "#8b93ff" },
                ]}
              />
            }
          />
          {a ? (
            <AreaChart
              data={a.series}
              series={[
                { key: "calls", label: "Calls", color: "#2dd4bf" },
                { key: "leads", label: "Leads", color: "#8b93ff" },
              ]}
            />
          ) : (
            <div className="skeleton h-60 rounded-xl" />
          )}
        </Card>
        <Card>
          <CardHeader title="How calls ended" subtitle="Last 30 days" />
          {a && a.by_outcome.length > 0 ? (
            <Donut
              centerLabel="calls"
              parts={a.by_outcome.map((o) => ({
                label: label(o.key),
                value: o.count,
                color: OUTCOME_COLORS[o.key] ?? "#64748b",
              }))}
            />
          ) : (
            <Empty title="No calls yet">Outcomes appear after the first call.</Empty>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Recent calls"
            subtitle="Select a call to see the AI summary and what happened"
            action={
              <ButtonLink href="/app/calls" variant="secondary" size="sm">
                All calls
              </ButtonLink>
            }
          />
          {overview.data.recent_activity.length === 0 ? (
            <Empty title="No calls yet" icon={PhoneIncoming}>
              Calls appear here as soon as your receptionist answers them.
            </Empty>
          ) : (
            <CallsTable calls={overview.data.recent_activity} onSelect={setSelected} />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Waiting for a callback"
            subtitle="Customers who asked your team to call back"
          />
          {waiting.length === 0 ? (
            <Empty title="All caught up" icon={PhoneCall}>
              New callback requests show up here.
            </Empty>
          ) : (
            <ul className="-mx-2 space-y-1">
              {waiting.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/app/lead?id=${l.id}`}
                    className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${l.urgency === "emergency" ? "bg-signal shadow-[0_0_10px_#ff5c7a]" : l.urgency === "urgent" ? "bg-ember" : "bg-accent"}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-frost">
                        {l.customer_name ?? "Unknown caller"}
                      </span>
                      <span className="block truncate text-xs text-haze">
                        {phone(l.callback_number)}, {dateTime(l.created_at)}
                      </span>
                    </span>
                    <UrgencyBadge urgency={l.urgency} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <CallDrawer call={selected} onClose={() => setSelected(null)} />
    </>
  );
}
