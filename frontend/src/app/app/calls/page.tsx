"use client";

import { PhoneIncoming } from "lucide-react";
import { useMemo, useState } from "react";
import { CallDrawer } from "@/components/call-drawer";
import { CallsTable } from "@/components/calls-table";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  PageHeader,
  SearchInput,
  Segmented,
  Spinner,
} from "@/components/ui";
import { api } from "@/lib/api";
import type { CallRow } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

type Filter = "all" | "leads" | "emergency" | "forwarded" | "missed";
const PAGE = 100;

export default function CallsPage() {
  const [limit, setLimit] = useState(PAGE);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<CallRow | null>(null);
  const { data, error, loading, reload } = useLoad(
    () => api<{ items: CallRow[]; total: number }>(`/api/calls?limit=${limit}`),
    [limit],
  );

  const items = useMemo(() => data?.items ?? [], [data]);
  const match = (c: CallRow) => {
    if (filter === "leads" && !c.lead_created) return false;
    if (filter === "emergency" && !c.urgent) return false;
    if (filter === "forwarded" && c.routing === "ai" && c.transfer_status === "none") return false;
    if (filter === "missed" && !["failed", "no_conversation"].includes(c.outcome)) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [c.caller_name, c.caller, c.summary].some((v) => v?.toLowerCase().includes(needle));
  };
  const shown = items.filter(match);
  const count = (f: Filter) =>
    items.filter((c) => {
      if (f === "leads") return c.lead_created;
      if (f === "emergency") return c.urgent;
      if (f === "forwarded") return c.routing !== "ai" || c.transfer_status !== "none";
      if (f === "missed") return ["failed", "no_conversation"].includes(c.outcome);
      return true;
    }).length;

  return (
    <>
      <PageHeader
        title="Call history"
        subtitle="Every call to your AI receptionist, with the AI's summary. Recordings and transcripts are not stored."
      />
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            label="Filter calls"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: items.length },
              { value: "leads", label: "With a lead", count: count("leads") },
              { value: "emergency", label: "Emergencies", count: count("emergency") },
              { value: "forwarded", label: "Transferred or forwarded", count: count("forwarded") },
              { value: "missed", label: "No conversation", count: count("missed") },
            ]}
          />
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search name, number or summary"
            className="lg:w-80"
          />
        </div>
        {loading && !data ? (
          <Spinner />
        ) : error || !data ? (
          <ErrorState message={error ?? "Could not load calls"} onRetry={reload} />
        ) : shown.length === 0 ? (
          <Empty title={items.length ? "No calls match" : "No calls yet"} icon={PhoneIncoming}>
            {items.length
              ? "Try another filter or search."
              : "Calls appear here as soon as your receptionist answers them."}
          </Empty>
        ) : (
          <>
            <CallsTable calls={shown} onSelect={setSelected} />
            <div className="mt-5 flex items-center justify-between text-sm text-haze">
              <span className="num">
                Showing {shown.length} of {data.total} calls
              </span>
              {data.total > items.length && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loading}
                  onClick={() => setLimit((l) => Math.min(200, l + PAGE))}
                  disabled={items.length >= 200}
                >
                  Load more
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
      <CallDrawer call={selected} onClose={() => setSelected(null)} />
    </>
  );
}
