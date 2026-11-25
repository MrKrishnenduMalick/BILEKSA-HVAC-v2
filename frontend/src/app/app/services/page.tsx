"use client";

import { Building2, Factory, Home, Layers, Wrench } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Card,
  Empty,
  ErrorState,
  PageHeader,
  Segmented,
  Spinner,
  Table,
  Td,
} from "@/components/ui";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Service } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

type Seg = "all" | "residential" | "commercial" | "industrial";
const SEG_ICON = { residential: Home, commercial: Building2, industrial: Factory };

const priceText = (s: Service) =>
  s.price_min_cents == null && s.price_max_cents == null
    ? "Team confirms"
    : s.price_min_cents === s.price_max_cents
      ? money(s.price_min_cents)
      : s.price_min_cents == null
        ? `Up to ${money(s.price_max_cents)}`
        : s.price_max_cents == null
          ? `From ${money(s.price_min_cents)}`
          : `${money(s.price_min_cents)} – ${money(s.price_max_cents)}`;

export default function ServicesPage() {
  const [seg, setSeg] = useState<Seg>("all");
  const { data, error, loading, reload } = useLoad(() => api<Service[]>("/api/business/services"));
  const list = (data ?? []).filter((s) => seg === "all" || !s.segment || s.segment === seg);
  const n = (k: Seg) => (data ?? []).filter((s) => !s.segment || s.segment === k).length;

  return (
    <>
      <PageHeader
        title="Services & pricing"
        subtitle="The services and approved price ranges your receptionist can quote. Anything not listed, it offers a callback for."
        action={
          <Segmented
            label="Customer type"
            value={seg}
            onChange={setSeg}
            options={[
              { value: "all", label: "All", count: data?.length },
              { value: "residential", label: "Residential", count: n("residential") },
              { value: "commercial", label: "Commercial", count: n("commercial") },
              { value: "industrial", label: "Industrial", count: n("industrial") },
            ]}
          />
        }
      />
      <Card>
        {loading ? (
          <Spinner />
        ) : error || !data ? (
          <ErrorState message={error ?? "Could not load services"} onRetry={reload} />
        ) : list.length === 0 ? (
          <Empty title="No services set" icon={Wrench}>
            BILEKSA adds your services during setup.
          </Empty>
        ) : (
          <Table head={["Service", "Offered to", "Price range", "Note"]} minWidth={720}>
            {list.map((s) => {
              const Icon = s.segment ? SEG_ICON[s.segment] : Layers;
              return (
                <tr key={s.id}>
                  <Td>
                    <p className="font-semibold text-frost">{s.name}</p>
                    {s.description && (
                      <p className="mt-0.5 text-[13px] leading-5 text-haze">{s.description}</p>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-mist">
                      <Icon size={14} className="text-iris" aria-hidden />
                      {s.segment
                        ? s.segment[0].toUpperCase() + s.segment.slice(1)
                        : "All customers"}
                    </span>
                  </Td>
                  <Td className="num whitespace-nowrap font-semibold text-frost">{priceText(s)}</Td>
                  <Td className="text-[13px] text-mist">
                    {s.price_note ?? "—"}
                    {!s.available && (
                      <span className="ml-2">
                        <Badge tone="gray">Not offered now</Badge>
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
