"use client";

import { Building2, Home, Siren, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Badge,
  Card,
  Empty,
  ErrorState,
  PageHeader,
  SearchInput,
  Spinner,
  Stat,
  Table,
  Td,
} from "@/components/ui";
import { api } from "@/lib/api";
import { day, label, phone } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useLoad(() => api<Customer[]>("/api/customers"));
  const people = (data ?? []).filter((p) =>
    q.trim()
      ? [p.name, p.phone, p.address, p.zip_code, p.latest_issue].some((v) =>
          v?.toLowerCase().includes(q.toLowerCase()),
        )
      : true,
  );
  const repeat = (data ?? []).filter((p) => p.calls > 1 || p.requests > 1).length;

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Everyone your receptionist has spoken with, grouped by phone number."
      />
      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <ErrorState message={error ?? "Could not load customers"} onRetry={reload} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Customers" value={data.length} icon={Users} />
            <Stat label="Repeat callers" value={repeat} icon={Home} tone="iris" />
            <Stat
              label="With open requests"
              value={data.filter((p) => p.open_requests > 0).length}
              icon={Building2}
              tone="ember"
            />
            <Stat
              label="Reported an emergency"
              value={data.filter((p) => p.emergencies > 0).length}
              icon={Siren}
              tone="signal"
            />
          </div>
          <Card>
            <div className="mb-5 flex justify-end">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Search name, number, address or problem"
                className="w-full sm:w-96"
              />
            </div>
            {people.length === 0 ? (
              <Empty title={data.length ? "No customers match" : "No customers yet"} icon={Users}>
                {data.length ? "Try another search." : "Customers appear after their first call."}
              </Empty>
            ) : (
              <Table
                head={["Customer", "Address", "Latest request", "Calls", "Open", "Last contact"]}
                minWidth={820}
              >
                {people.map((p) => (
                  <tr key={p.key}>
                    <Td className="w-56">
                      <Link
                        href={`/app/lead?id=${p.latest_lead_id}`}
                        className="font-semibold text-frost hover:text-accent"
                      >
                        {p.name ?? "Unknown caller"}
                      </Link>
                      <span className="num block text-xs text-haze">{phone(p.phone)}</span>
                    </Td>
                    <Td className="max-w-[14rem] text-mist">
                      {[p.address, p.zip_code].filter(Boolean).join(", ") || "—"}
                    </Td>
                    <Td className="max-w-sm">
                      <p className="line-clamp-2 text-[13px] text-mist">{p.latest_issue ?? "—"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.services.slice(0, 3).map((s) => (
                          <Badge key={s}>{label(s)}</Badge>
                        ))}
                        {p.emergencies > 0 && (
                          <Badge tone="red" dot>
                            Emergency
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td className="num text-mist">{p.calls}</Td>
                    <Td>
                      {p.open_requests > 0 ? (
                        <Badge tone="amber">{p.open_requests} open</Badge>
                      ) : (
                        <span className="text-haze">—</span>
                      )}
                    </Td>
                    <Td className="num whitespace-nowrap text-mist">{day(p.last_contact)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
