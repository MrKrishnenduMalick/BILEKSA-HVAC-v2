"use client";

import { ArrowUpRight, Clock, PhoneIncoming, Siren } from "lucide-react";
import Link from "next/link";
import { OutcomeBadge, TransferBadge, UrgencyBadge } from "./badges";
import { ROUTING } from "./calls-table";
import { Alert, Badge, ButtonLink, Drawer, KeyValue, Spinner, Timeline } from "./ui";
import { api } from "@/lib/api";
import { dateTime, duration, label, phone } from "@/lib/format";
import type { CallDetail, CallRow } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export const EVENT_TEXT: Record<string, string> = {
  created: "Lead captured",
  updated: "Details updated",
  emergency: "Emergency reported",
  callback_requested: "Callback requested",
  callback_done: "Callback done",
  callback_cancelled: "Callback cancelled",
  appointment_requested: "Appointment requested",
  appointment_confirmed: "Appointment confirmed",
  appointment_cancelled: "Appointment cancelled",
  appointment_done: "Appointment completed",
  status_changed: "Status changed",
  note: "Note added",
  repeat_call: "Called again",
};

export const eventTone = (kind: string) =>
  kind === "emergency"
    ? "red"
    : kind.startsWith("callback")
      ? "amber"
      : kind.startsWith("appointment")
        ? "blue"
        : kind === "note"
          ? "gray"
          : "teal";

function Body({ id }: { id: string }) {
  const { data, error, loading } = useLoad(() => api<CallDetail>(`/api/calls/${id}`), [id]);
  if (loading) return <Spinner />;
  if (error || !data) return <Alert>{error ?? "Could not load this call"}</Alert>;
  const lead = data.lead;
  return (
    <div className="space-y-6">
      {data.urgent && (
        <Alert tone="red">
          <span className="font-semibold">
            Emergency: {label(data.emergency_type ?? "emergency")}.
          </span>{" "}
          The owner was alerted when it was reported.
        </Alert>
      )}
      <div className="grid grid-cols-3 gap-3">
        {[
          [PhoneIncoming, "Started", dateTime(data.started_at)],
          [Clock, "Duration", duration(data.duration_seconds)],
          [Siren, "Urgency", lead ? label(lead.urgency) : data.urgent ? "Emergency" : "Normal"],
        ].map(([Icon, k, v]) => {
          const I = Icon as typeof Clock;
          return (
            <div key={k as string} className="glass-inset rounded-2xl p-3">
              <I size={15} className="text-accent" aria-hidden />
              <p className="mt-2 text-[11px] text-haze">{k as string}</p>
              <p className="num text-sm font-semibold text-frost">{v as string}</p>
            </div>
          );
        })}
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-frost">AI summary</h3>
        <p className="glass-inset rounded-2xl p-4 text-sm leading-6 text-mist">
          {data.summary ?? "No summary yet. It appears when the call report arrives."}
        </p>
      </section>
      <section className="flex flex-wrap gap-2">
        <OutcomeBadge outcome={data.outcome} />
        {data.transfer_status !== "none" && <TransferBadge status={data.transfer_status} />}
        {ROUTING[data.routing] && <Badge tone="amber">{ROUTING[data.routing]}</Badge>}
        {lead && <UrgencyBadge urgency={lead.urgency} />}
      </section>
      {lead ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-frost">Customer</h3>
            <Link
              href={`/app/lead?id=${lead.id}`}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline"
            >
              Open lead <ArrowUpRight size={14} aria-hidden />
            </Link>
          </div>
          <KeyValue
            items={[
              ["Name", lead.customer_name],
              [
                "Callback number",
                `${phone(lead.callback_number)}${lead.callback_number && !lead.number_confirmed ? " (not confirmed)" : ""}`,
              ],
              ["Address", [lead.address, lead.zip_code].filter(Boolean).join(", ")],
              ["Service", label(lead.service_type)],
              ["Equipment", label(lead.equipment_type)],
              ["Problem", lead.issue_summary],
            ]}
          />
        </section>
      ) : (
        <p className="text-sm text-haze">No customer details were captured on this call.</p>
      )}
      {data.timeline.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-frost">What happened</h3>
          <Timeline
            items={data.timeline.map((e) => ({
              title: EVENT_TEXT[e.kind] ?? label(e.kind),
              detail: e.detail,
              meta: `${dateTime(e.at)}, ${e.actor.startsWith("user:") ? "your team" : "AI receptionist"}`,
              tone: eventTone(e.kind),
            }))}
          />
        </section>
      )}
      {data.ended_reason && (
        <p className="text-xs text-haze">Ended: {label(data.ended_reason.replace(/[-.]/g, "_"))}</p>
      )}
    </div>
  );
}

export function CallDrawer({ call, onClose }: { call: CallRow | null; onClose: () => void }) {
  return (
    <Drawer
      open={!!call}
      onClose={onClose}
      title={call?.caller_name ?? "Unknown caller"}
      subtitle={call ? `${phone(call.caller)}, ${dateTime(call.started_at)}` : undefined}
      footer={
        call?.lead_id ? (
          <ButtonLink href={`/app/lead?id=${call.lead_id}`} variant="secondary" className="w-full">
            Manage this lead
          </ButtonLink>
        ) : undefined
      }
    >
      {call && <Body id={call.id} />}
    </Drawer>
  );
}
