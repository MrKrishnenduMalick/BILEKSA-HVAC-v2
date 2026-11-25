"use client";

import { CalendarClock, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UrgencyBadge } from "@/components/badges";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Empty,
  PageHeader,
  Segmented,
  Spinner,
  Table,
  Td,
} from "@/components/ui";
import { api, send } from "@/lib/api";
import { dateTime, label, phone } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

function Customer({ l }: { l: Lead }) {
  return (
    <>
      <Link className="font-semibold text-frost hover:text-accent" href={`/app/lead?id=${l.id}`}>
        {l.customer_name ?? "Unknown caller"}
      </Link>
      <span className="num block text-xs text-haze">{phone(l.callback_number)}</span>
    </>
  );
}

export default function CallbacksPage() {
  const { notify } = useToast();
  const [cbView, setCbView] = useState<"waiting" | "all">("waiting");
  const { data, error, loading, reload } = useLoad(() => api<Lead[]>("/api/leads?callbacks=true"));
  const appts = useLoad(() => api<Lead[]>("/api/leads?appointments=true"));

  async function act(fn: () => Promise<unknown>, ok: string, after: () => Promise<void>) {
    try {
      await fn();
      notify(ok);
      await after();
    } catch (e) {
      notify(e instanceof Error ? e.message : "That didn't save", "error");
    }
  }

  const callbacks = (data ?? []).filter((l) =>
    cbView === "waiting" ? l.callback_status === "requested" : true,
  );
  const sorted = [...callbacks].sort((a, b) => {
    const rank = (l: Lead) => (l.urgency === "emergency" ? 0 : l.urgency === "urgent" ? 1 : 2);
    return rank(a) - rank(b) || b.created_at.localeCompare(a.created_at);
  });

  return (
    <>
      <PageHeader
        title="Callbacks & appointments"
        subtitle="Callers who asked your team to call them back or requested an appointment. The receptionist never promises a time and never confirms a booking."
      />
      <Card className="mb-5">
        <CardHeader
          icon={PhoneCall}
          title="Callback requests"
          subtitle="Emergencies first, then urgent requests"
          action={
            <Segmented
              label="Callbacks to show"
              value={cbView}
              onChange={setCbView}
              options={[
                {
                  value: "waiting",
                  label: "Waiting",
                  count: (data ?? []).filter((l) => l.callback_status === "requested").length,
                },
                { value: "all", label: "All", count: data?.length },
              ]}
            />
          }
        />
        {loading ? (
          <Spinner />
        ) : error || !data ? (
          <Alert>{error}</Alert>
        ) : sorted.length === 0 ? (
          <Empty title="No callback requests" icon={PhoneCall}>
            {cbView === "waiting" ? "Nobody is waiting for a call back." : undefined}
          </Empty>
        ) : (
          <Table
            head={["Customer", "Preferred time", "Reason", "Urgency", "Requested", "Status", ""]}
            minWidth={900}
          >
            {sorted.map((l) => (
              <tr key={l.id}>
                <Td className="w-52">
                  <Customer l={l} />
                </Td>
                <Td className="text-mist">{l.callback_preferred_time ?? "Any time"}</Td>
                <Td className="max-w-xs">
                  <p className="line-clamp-2 text-[13px] text-mist">
                    {l.callback_reason ?? l.issue_summary ?? "—"}
                  </p>
                </Td>
                <Td>
                  <UrgencyBadge urgency={l.urgency} />
                </Td>
                <Td className="num whitespace-nowrap text-mist">{dateTime(l.created_at)}</Td>
                <Td>
                  <Badge dot tone={l.callback_status === "requested" ? "amber" : "green"}>
                    {l.callback_status === "requested" ? "Waiting" : label(l.callback_status)}
                  </Badge>
                </Td>
                <Td className="text-right">
                  {l.callback_status === "requested" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        act(
                          () => send(`/api/leads/${l.id}`, "PATCH", { callback_status: "done" }),
                          "Callback marked done",
                          reload,
                        )
                      }
                    >
                      Mark done
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader
          icon={CalendarClock}
          title="Appointment requests"
          subtitle="These are requests, not bookings. Confirm the time with the customer, then mark it confirmed."
        />
        {appts.loading ? (
          <Spinner />
        ) : appts.error || !appts.data ? (
          <Alert>{appts.error}</Alert>
        ) : appts.data.length === 0 ? (
          <Empty title="No appointment requests" icon={CalendarClock} />
        ) : (
          <Table
            head={["Customer", "Preferred time", "Service", "Urgency", "Status", ""]}
            minWidth={860}
          >
            {appts.data.map((l) => (
              <tr key={l.id}>
                <Td className="w-52">
                  <Customer l={l} />
                </Td>
                <Td className="text-mist">{l.preferred_appointment ?? "—"}</Td>
                <Td className="max-w-xs text-mist">
                  {l.service_type ? label(l.service_type) : (l.issue_summary ?? "—")}
                </Td>
                <Td>
                  <UrgencyBadge urgency={l.urgency} />
                </Td>
                <Td>
                  <Badge
                    dot
                    tone={
                      l.appointment_status === "requested"
                        ? "amber"
                        : l.appointment_status === "cancelled"
                          ? "gray"
                          : "green"
                    }
                  >
                    {label(l.appointment_status)}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap text-right">
                  {l.appointment_status === "requested" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          act(
                            () =>
                              send(`/api/leads/${l.id}`, "PATCH", {
                                appointment_status: "confirmed",
                              }),
                            "Appointment confirmed",
                            appts.reload,
                          )
                        }
                      >
                        Confirmed
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          act(
                            () =>
                              send(`/api/leads/${l.id}`, "PATCH", {
                                appointment_status: "cancelled",
                              }),
                            "Appointment cancelled",
                            appts.reload,
                          )
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {l.appointment_status === "confirmed" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        act(
                          () => send(`/api/leads/${l.id}`, "PATCH", { appointment_status: "done" }),
                          "Appointment marked done",
                          appts.reload,
                        )
                      }
                    >
                      Mark done
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
