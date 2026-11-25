"use client";

import { Lock, PhoneForwarded, PhoneCall, Siren } from "lucide-react";
import { useSession } from "@/components/session";
import { Alert, Badge, Card, CardHeader, PageHeader, PageSkeleton } from "@/components/ui";

const FLOW = [
  ["Recognised", "The moment a caller describes a hazard, before any other questions."],
  [
    "Recorded and escalated",
    "Your team is alerted and, if no transfer is possible, an urgent callback is requested straight away.",
  ],
  ["Safety steps", "Short, fixed safety instructions, then your approved extra wording."],
  ["Transfer", "Connects to your emergency line when your rules allow it."],
];

export default function EmergencyPage() {
  const { me } = useSession();
  const b = me.business;
  if (!b) return <PageSkeleton />;
  const transferFirst = b.emergency_preference === "transfer_then_callback";

  return (
    <>
      <PageHeader
        title="Emergency rules"
        subtitle="How your receptionist handles gas leaks, carbon monoxide, smoke, sparks, refrigerant leaks and other hazards."
      />
      <Card className="relative mb-5 overflow-hidden">
        <div
          className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff5c7a, transparent 65%)" }}
          aria-hidden
        />
        <CardHeader
          icon={Siren}
          title="What happens on an emergency call"
          subtitle="The fixed life-safety instructions can't be changed or removed"
        />
        <ol className="relative grid gap-3 md:grid-cols-4">
          {FLOW.map(([t, d], i) => (
            <li key={t} className="glass-inset rounded-2xl p-4">
              <p className="num text-xs font-semibold text-signal">Step {i + 1}</p>
              <p className="mt-1.5 font-semibold text-frost">{t}</p>
              <p className="mt-1 text-[13px] leading-5 text-mist">{d}</p>
            </li>
          ))}
        </ol>
        <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
          <Badge tone={transferFirst ? "teal" : "amber"}>
            {transferFirst ? "Transfer first, then urgent callback" : "Urgent callback only"}
          </Badge>
          <Badge tone={b.transfer_emergencies_after_hours ? "teal" : "gray"}>
            {b.transfer_emergencies_after_hours
              ? "Emergencies transferred after hours"
              : "No transfers after hours"}
          </Badge>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Categories"
          subtitle="Standard categories are always recognised. Your business can add categories and approved wording."
        />
        <ul className="divide-y divide-white/[0.06]">
          {b.emergency_rules.map((r) => (
            <li key={r.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${r.builtin ? "bg-signal/10 text-signal ring-signal/25" : "bg-iris/10 text-iris ring-iris/25"}`}
                >
                  {r.builtin ? <Lock size={14} aria-hidden /> : <Siren size={14} aria-hidden />}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-frost">
                    {r.label}{" "}
                    <span className="ml-1 align-middle">
                      {r.builtin ? <Badge>Standard</Badge> : <Badge tone="blue">Custom</Badge>}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-mist">
                    {r.instructions || "Fixed safety steps only."}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-mist sm:pt-1">
                {r.transfer ? (
                  <>
                    <PhoneForwarded size={14} className="text-accent" aria-hidden /> Transfer to
                    emergency line
                  </>
                ) : (
                  <>
                    <PhoneCall size={14} className="text-ember" aria-hidden /> Urgent callback
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Alert tone="blue">
            Need a new category or different wording? BILEKSA reviews and adds it so safety
            instructions stay correct.
          </Alert>
        </div>
      </Card>
    </>
  );
}
