"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UrgencyBadge } from "@/components/badges";
import {
  Badge,
  Card,
  Empty,
  ErrorState,
  PageHeader,
  SearchInput,
  Segmented,
  Spinner,
  Table,
  Td,
} from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, label, phone } from "@/lib/format";
import { LEAD_STATUSES, type Lead } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const STATUS_TONE: Record<string, "teal" | "blue" | "amber" | "green" | "gray"> = {
  new: "teal",
  contacted: "blue",
  in_progress: "amber",
  converted: "green",
  closed: "gray",
  unqualified: "gray",
};

export default function LeadsPage() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useLoad(
    () => api<Lead[]>(`/api/leads${status !== "all" ? `?status=${status}` : ""}`),
    [status],
  );
  const leads = (data ?? []).filter((l) =>
    q.trim()
      ? [l.customer_name, l.callback_number, l.issue_summary, l.address, l.zip_code].some((v) =>
          v?.toLowerCase().includes(q.toLowerCase()),
        )
      : true,
  );

  return (
    <>
      <PageHeader title="Leads" subtitle="Customers captured by your AI receptionist." />
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              ...LEAD_STATUSES.map((s) => ({ value: s, label: label(s) })),
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search leads" className="lg:w-72" />
        </div>
        {loading ? (
          <Spinner />
        ) : error || !data ? (
          <ErrorState message={error ?? "Could not load leads"} onRetry={reload} />
        ) : leads.length === 0 ? (
          <Empty title="No leads yet" icon={Inbox}>
            New leads appear here automatically after calls.
          </Empty>
        ) : (
          <Table
            head={["Customer", "Address", "HVAC problem", "Urgency", "Status", "Updated"]}
            minWidth={880}
          >
            {leads.map((l) => (
              <tr key={l.id}>
                <Td className="w-56">
                  <Link
                    href={`/app/lead?id=${l.id}`}
                    className="font-semibold text-frost hover:text-accent"
                  >
                    {l.customer_name ?? "Unknown caller"}
                  </Link>
                  <span className="num block text-xs text-haze">
                    {phone(l.callback_number)}
                    {l.callback_number && !l.number_confirmed && (
                      <span className="text-[#ffd08a]"> (not confirmed)</span>
                    )}
                  </span>
                </Td>
                <Td className="max-w-[13rem] text-mist">
                  {[l.address, l.zip_code].filter(Boolean).join(", ") || "—"}
                </Td>
                <Td className="max-w-sm">
                  <p className="line-clamp-2 text-[13px] text-mist">
                    {l.issue_summary ?? label(l.service_type)}
                  </p>
                  {l.equipment_type && (
                    <span className="mt-1 block text-xs text-haze">
                      Equipment: {label(l.equipment_type)}
                    </span>
                  )}
                </Td>
                <Td>
                  <UrgencyBadge urgency={l.urgency} />
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[l.status] ?? "gray"}>{label(l.status)}</Badge>
                </Td>
                <Td className="num whitespace-nowrap text-mist">{dateTime(l.updated_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
