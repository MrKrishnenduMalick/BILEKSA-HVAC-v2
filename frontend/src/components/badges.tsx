import { label } from "@/lib/format";
import { Badge, type Tone } from "./ui";

const OUTCOME_TONE: Record<string, Tone> = {
  lead_captured: "teal",
  callback_requested: "blue",
  appointment_requested: "blue",
  forwarded: "amber",
  transfer: "blue",
  answered: "green",
  no_conversation: "gray",
  failed: "red",
  in_progress: "amber",
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <Badge dot tone={OUTCOME_TONE[outcome] ?? "gray"}>
      {label(outcome)}
    </Badge>
  );
}

export function TransferBadge({ status }: { status: string }) {
  if (status === "none") return <span className="text-haze">—</span>;
  const text = status === "attempted" ? "Attempted, outcome unconfirmed" : label(status);
  const tone =
    status === "connected"
      ? "green"
      : status === "attempted"
        ? "amber"
        : status === "not_allowed"
          ? "gray"
          : "red";
  return <Badge tone={tone}>{text}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const tone = urgency === "emergency" ? "red" : urgency === "urgent" ? "amber" : "gray";
  return (
    <Badge dot={urgency === "emergency" || urgency === "urgent"} tone={tone}>
      {label(urgency)}
    </Badge>
  );
}

export function ReceptionistBadge({ state, label: text }: { state: string; label: string }) {
  const tone =
    state === "active"
      ? "green"
      : state === "verified"
        ? "blue"
        : state === "failed"
          ? "red"
          : "amber";
  return <Badge tone={tone}>{text}</Badge>;
}

const SERVICE_TONE: Record<string, Tone> = {
  active: "green",
  onboarding: "blue",
  limit_reached: "red",
  suspended: "red",
};

export function ServiceStatusBadge({ status }: { status: string }) {
  const text = status === "limit_reached" ? "LIMIT_REACHED" : label(status);
  return (
    <Badge dot tone={SERVICE_TONE[status] ?? "gray"}>
      {text}
    </Badge>
  );
}

export function UsageBar({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, percent));
  const color =
    pct >= 100
      ? "bg-signal shadow-[0_0_14px_#ff5c7a]"
      : pct >= 80
        ? "bg-ember shadow-[0_0_14px_#f5a524]"
        : "bg-gradient-to-r from-accent to-iris shadow-[0_0_14px_var(--accent)]";
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Minutes used"
    >
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
