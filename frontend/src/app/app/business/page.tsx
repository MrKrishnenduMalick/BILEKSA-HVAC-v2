"use client";

import { Building2, Clock, HelpCircle, MapPin, PhoneCall } from "lucide-react";
import { useSession } from "@/components/session";
import {
  Badge,
  Card,
  CardHeader,
  Empty,
  KeyValue,
  PageHeader,
  PageSkeleton,
  Spinner,
} from "@/components/ui";
import { api } from "@/lib/api";
import { label, phone } from "@/lib/format";
import type { Faq, PhoneLine } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Hours = { weekday: number; open_time: string; close_time: string };
type Area = { id: string; zip_code: string; label: string | null };

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fmt = (t: string) => {
  const h = Number(t.slice(0, 2));
  const m = t.slice(3, 5);
  return `${h % 12 || 12}${m === "00" ? "" : `:${m}`} ${h < 12 ? "AM" : "PM"}`;
};

/** What the AI receptionist knows about the business. Read-only: BILEKSA makes changes. */
export default function BusinessInfoPage() {
  const { me } = useSession();
  const b = me.business;
  const hours = useLoad(() => api<Hours[]>("/api/business/hours"));
  const areas = useLoad(() => api<Area[]>("/api/business/areas"));
  const faqs = useLoad(() => api<Faq[]>("/api/business/faqs"));
  const line = useLoad(() => api<PhoneLine>("/api/phone"));
  if (!b) return <PageSkeleton />;
  const today = (new Date().getDay() + 6) % 7;

  return (
    <>
      <PageHeader
        title="Business profile"
        subtitle="Everything your AI receptionist uses to answer calls. To change anything, contact BILEKSA support."
      />
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Building2} title="Profile and routing" />
          <KeyValue
            items={[
              ["Business name", b.name],
              ["Contact email", b.contact_email],
              ["Contact phone", phone(b.contact_phone)],
              ["Address", b.address],
              ["Website", b.website],
              ["Time zone", b.timezone.replace("_", " ")],
              ["Transfer (direct line)", phone(b.transfer_number)],
              ["Backup / fallback number", phone(b.fallback_number)],
              ["Emergency line", phone(b.emergency_number)],
              ["Notifications sent to", b.notification_email ?? b.contact_email],
            ]}
          />
        </Card>
        <Card>
          <CardHeader
            icon={PhoneCall}
            title="Phone line"
            subtitle="Your customers keep calling your usual number"
          />
          {line.loading ? (
            <Spinner />
          ) : !line.data ? (
            <Empty title="Not connected yet">
              BILEKSA assigns your forwarding number during setup.
            </Empty>
          ) : (
            <>
              <KeyValue
                items={[
                  ["Your business number", phone(line.data.business_number)],
                  ["Forward to (BILEKSA)", phone(line.data.destination_number)],
                  [
                    "Status",
                    <Badge key="s" dot tone={line.data.state === "verified" ? "green" : "amber"}>
                      {label(line.data.state)}
                    </Badge>,
                  ],
                ]}
              />
              <ol className="mt-5 space-y-2 text-sm text-mist">
                {line.data.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-xs font-semibold text-frost">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s.replace(/\*\*/g, "")}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon={Clock}
            title="Hours"
            subtitle="Outside these hours the after-hours rules apply"
          />
          {hours.data && hours.data.length > 0 ? (
            <ul className="space-y-2.5">
              {DAYS.map((d, i) => {
                const h = hours.data?.find((x) => x.weekday === i);
                const left = h ? (minutes(h.open_time) / 1440) * 100 : 0;
                const width = h ? ((minutes(h.close_time) - minutes(h.open_time)) / 1440) * 100 : 0;
                return (
                  <li key={d} className="grid grid-cols-[92px_1fr_auto] items-center gap-4 text-sm">
                    <span className={i === today ? "font-semibold text-frost" : "text-mist"}>
                      {d}
                    </span>
                    <span className="relative h-2 rounded-full bg-white/[0.05]" aria-hidden>
                      {h && (
                        <span
                          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-accent to-iris"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      )}
                    </span>
                    <span className="num w-36 text-right text-mist">
                      {h ? `${fmt(h.open_time)} – ${fmt(h.close_time)}` : "Closed"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="Hours not set" />
          )}
        </Card>
        <Card>
          <CardHeader
            icon={MapPin}
            title="Service area"
            subtitle={areas.data ? `${areas.data.length} ZIP codes covered` : undefined}
          />
          {areas.data && areas.data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {areas.data.map((a) => (
                <span
                  key={a.id}
                  className="num rounded-lg bg-white/[0.05] px-2.5 py-1 text-[13px] text-frost ring-1 ring-white/10"
                >
                  {a.zip_code}
                </span>
              ))}
            </div>
          ) : (
            <Empty title="No service areas set" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={HelpCircle}
          title="FAQs and policies"
          subtitle="Approved answers your receptionist repeats word for word"
        />
        {faqs.data && faqs.data.filter((f) => f.active).length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {faqs.data
              .filter((f) => f.active)
              .map((f) => (
                <div key={f.id} className="glass-inset rounded-2xl p-4">
                  <p className="flex items-start justify-between gap-3 font-semibold text-frost">
                    {f.question}
                    {f.category === "policy" && <Badge tone="blue">Policy</Badge>}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-mist">{f.answer}</p>
                </div>
              ))}
          </div>
        ) : (
          <Empty title="No FAQs yet" />
        )}
      </Card>
    </>
  );
}
