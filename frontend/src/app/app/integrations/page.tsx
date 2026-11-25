"use client";

import {
  AudioLines,
  CalendarDays,
  Mail,
  PhoneCall,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/components/session";
import { Badge, Card, PageHeader, PageSkeleton, type Tone } from "@/components/ui";
import { api } from "@/lib/api";
import { label, phone } from "@/lib/format";
import type { PhoneLine, Receptionist } from "@/lib/types";
import { useLoad } from "@/lib/use-load";
import { DEMO } from "@/lib/demo";

function Tile({
  icon: Icon,
  name,
  status,
  tone,
  children,
}: {
  icon: LucideIcon;
  name: string;
  status: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-accent ring-1 ring-white/10">
          <Icon size={20} aria-hidden />
        </span>
        <Badge dot tone={tone}>
          {status}
        </Badge>
      </div>
      <h2 className="mt-4 font-semibold text-frost">{name}</h2>
      <div className="mt-1.5 text-sm leading-6 text-mist">{children}</div>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { me } = useSession();
  const b = me.business;
  const line = useLoad(() => api<PhoneLine>("/api/phone"));
  const r = useLoad(() => api<Receptionist>("/api/receptionist"));
  if (!b || line.loading || r.loading) return <PageSkeleton />;
  const ln = line.data;
  const rec = r.data;

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="The services your receptionist is connected to. BILEKSA manages every connection and credential for you."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Tile
          icon={PhoneCall}
          name="Phone forwarding"
          status={DEMO ? "Off in the demo" : ln ? label(ln.state) : "Not connected"}
          tone={ln?.state === "verified" ? "green" : "amber"}
        >
          {ln ? (
            <>
              {phone(ln.business_number)} forwards to {phone(ln.destination_number)}
              {ln.forwarding_mode === "conditional"
                ? " when busy or unanswered."
                : " for every call."}
            </>
          ) : (
            "Your existing business number forwards to the receptionist. BILEKSA sets this up with you."
          )}
        </Tile>
        <Tile
          icon={AudioLines}
          name="Voice AI"
          status={rec?.live ? "Live" : label(rec?.provisioning_state ?? "pending")}
          tone={rec?.live ? "green" : rec?.provisioning_state === "failed" ? "red" : "amber"}
        >
          Speech, voice and conversation run on Vapi in your own account. Your business facts stay
          in your dashboard and are fetched live on every call.
        </Tile>
        <Tile
          icon={Mail}
          name="Email alerts"
          status={b.notification_email || b.contact_email ? "Active" : "No address"}
          tone={b.notification_email || b.contact_email ? "green" : "amber"}
        >
          Emergencies, call summaries and account updates go to{" "}
          <span className="text-frost">{b.notification_email ?? b.contact_email ?? "—"}</span>. They
          also appear under Notifications.
        </Tile>
        <Tile icon={ShieldCheck} name="Secure sign-in" status="Active" tone="green">
          Accounts are created by invitation only. Your data lives in a private database used by
          your business alone.
        </Tile>
        <Tile icon={CalendarDays} name="Booking calendar" status="Requests only" tone="gray">
          Appointment requests come to your dashboard for your team to confirm. Ask BILEKSA about
          connecting a scheduling system.
        </Tile>
      </div>
    </>
  );
}
