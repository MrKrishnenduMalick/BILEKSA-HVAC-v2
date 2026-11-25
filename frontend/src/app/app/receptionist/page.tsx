"use client";

import {
  Bot,
  CalendarClock,
  Check,
  Clock3,
  MessageSquareQuote,
  PhoneForwarded,
  ShieldCheck,
  X,
} from "lucide-react";
import { useSession } from "@/components/session";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  ErrorState,
  KeyValue,
  PageHeader,
  PageSkeleton,
} from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, label, phone } from "@/lib/format";
import type { Receptionist } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

function Rule({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${on ? "bg-leaf/15 text-leaf" : "bg-white/[0.06] text-haze"}`}
      >
        {on ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
      </span>
      <span className={`text-sm ${on ? "text-frost" : "text-haze"}`}>{children}</span>
    </li>
  );
}

const PROMISES = [
  "Answers with your business name and says it is an AI receptionist if asked",
  "Recognises emergencies at once, alerts your team and gives fixed safety steps",
  "Only states services, prices, hours and policies you approved",
  "Reads callback numbers back and asks the caller to confirm them",
  "Never promises an arrival time or confirms a booking you haven't confirmed",
  "Handles residential, commercial and industrial callers",
];

export default function ReceptionistPage() {
  const { me } = useSession();
  const b = me.business;
  const r = useLoad(() => api<Receptionist>("/api/receptionist"));
  if (!b || r.loading) return <PageSkeleton />;
  if (r.error || !r.data)
    return <ErrorState message={r.error ?? "Could not load"} onRetry={r.reload} />;
  const s = r.data;
  const paused = ["limit_reached", "suspended"].includes(s.service_status);

  return (
    <>
      <PageHeader
        title="AI receptionist"
        subtitle="How your receptionist answers and routes calls. Changes are made by BILEKSA so every rule is tested before it goes live."
      />
      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="orb h-20 w-20 shrink-0"
              data-state={paused ? "alert" : s.live ? "live" : "idle"}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-frost">{s.assistant_name}</p>
              <p className="mt-0.5 text-sm text-mist">{s.status_label}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge dot tone={s.live ? "green" : paused ? "red" : "amber"}>
                  {s.live ? "Live" : label(s.provisioning_state)}
                </Badge>
                <Badge tone="gray">Phone: {label(s.phone_state)}</Badge>
                <Badge tone="gray">Service: {label(s.service_status)}</Badge>
              </div>
              <p className="mt-3 text-xs text-haze">
                Last configuration update: {dateTime(s.last_config_update_at)}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5 sm:grid-cols-4">
            {[
              ["Answers as", b.name],
              ["Time zone", b.timezone.replace("_", " ")],
              ["Transfers", b.transfer_number ? phone(b.transfer_number) : "Off"],
              [
                "Emergencies",
                b.emergency_preference === "transfer_then_callback"
                  ? "Transfer first"
                  : "Urgent callback",
              ],
            ].map(([k, v]) => (
              <div key={k} className="glass-inset min-w-0 rounded-xl p-3">
                <dt className="text-xs text-haze">{k}</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-frost">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardHeader icon={ShieldCheck} title="What it always does" />
          <ul className="space-y-2">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-mist">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={PhoneForwarded}
            title="Transfers to your team"
            subtitle={`Mode: ${b.transfer_mode === "warm" ? "warm (introduces the caller first)" : "blind (connects directly)"}`}
          />
          <ul className="divide-y divide-white/[0.06]">
            <Rule on={b.transfer_in_hours}>Transfer during business hours</Rule>
            <Rule on={b.transfer_after_hours}>Transfer after hours</Rule>
            <Rule on={b.transfer_emergencies_after_hours}>Transfer emergencies after hours</Rule>
            <Rule on={b.emergency_preference === "transfer_then_callback"}>
              Emergencies: transfer first, then an urgent callback if nobody answers
            </Rule>
          </ul>
          <div className="mt-4 border-t border-white/[0.07] pt-4">
            <KeyValue
              items={[
                ["Transfer number", phone(b.transfer_number)],
                ["Backup line", phone(b.fallback_number)],
                ["Emergency line", phone(b.emergency_number)],
                ["Alerts sent to", b.notification_email ?? b.contact_email],
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader icon={Clock3} title="When nobody can take the call" />
          <div className="space-y-4">
            <div>
              <p className="text-xs text-haze">After-hours message</p>
              <p className="mt-1 text-sm leading-6 text-frost">
                {b.after_hours_message ||
                  "The receptionist takes the caller's details and a callback request."}
              </p>
            </div>
            <div>
              <p className="text-xs text-haze">If the receptionist is unavailable</p>
              <p className="mt-1 text-sm leading-6 text-frost">
                {b.unavailable_message ||
                  "Calls are forwarded to your backup line, so they are never dropped."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={MessageSquareQuote}
            title="Your company's instructions"
            subtitle="Extra guidance approved for your receptionist. Safety and honesty rules always come first."
          />
          {b.assistant_instructions ? (
            <p className="glass-inset whitespace-pre-line rounded-2xl p-4 text-sm leading-6 text-mist">
              {b.assistant_instructions}
            </p>
          ) : (
            <Alert tone="blue">No extra instructions yet. Ask BILEKSA to add any.</Alert>
          )}
        </Card>
        <Card>
          <CardHeader
            icon={CalendarClock}
            title="Appointments"
            subtitle="Read to callers who ask how booking works"
          />
          <p className="glass-inset rounded-2xl p-4 text-sm leading-6 text-mist">
            {b.appointment_policy ||
              "Appointment requests are passed to your team, who confirm the time with the customer."}
          </p>
          <p className="mt-4 flex items-start gap-2 text-xs text-haze">
            <Bot size={14} className="mt-0.5 shrink-0" aria-hidden /> The receptionist records a
            request and never confirms a booking itself.
          </p>
        </Card>
      </div>
    </>
  );
}
