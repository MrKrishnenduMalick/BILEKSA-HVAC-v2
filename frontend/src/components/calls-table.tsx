"use client";

import { AlertTriangle, PhoneForwarded } from "lucide-react";
import Link from "next/link";
import { OutcomeBadge, TransferBadge } from "./badges";
import { Badge, Table, Td } from "./ui";
import { dateTime, duration, label, phone } from "@/lib/format";
import type { CallRow } from "@/lib/types";

export const ROUTING: Record<string, string> = {
  forwarded_limit: "Forwarded (minute limit reached)",
  forwarded_suspended: "Forwarded (service suspended)",
  unavailable: "Forwarded (receptionist unavailable)",
};

/** Call history. `onSelect` opens the call detail panel when given. */
export function CallsTable({
  calls,
  leadLinks = true,
  onSelect,
}: {
  calls: CallRow[];
  leadLinks?: boolean;
  onSelect?: (call: CallRow) => void;
}) {
  return (
    <Table head={["Caller", "When", "Duration", "Summary", "Outcome", "Emergency"]} minWidth={860}>
      {calls.map((c) => (
        <tr
          key={c.id}
          className={onSelect ? "cursor-pointer" : undefined}
          onClick={onSelect ? () => onSelect(c) : undefined}
        >
          <Td className="w-56">
            {c.lead_id && leadLinks ? (
              <Link
                className="font-semibold text-frost hover:text-accent"
                href={`/app/lead?id=${c.lead_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {c.caller_name ?? "View lead"}
              </Link>
            ) : (
              <span className="font-semibold text-frost">{c.caller_name ?? "Unknown caller"}</span>
            )}
            <span className="num block text-xs text-haze">{phone(c.caller)}</span>
          </Td>
          <Td className="num whitespace-nowrap text-mist">{dateTime(c.started_at)}</Td>
          <Td className="num whitespace-nowrap text-mist">{duration(c.duration_seconds)}</Td>
          <Td className="max-w-md">
            <p className="line-clamp-2 text-[13px] leading-5 text-mist">{c.summary ?? "—"}</p>
            {ROUTING[c.routing] && (
              <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ember">
                <PhoneForwarded size={13} aria-hidden /> {ROUTING[c.routing]}
              </span>
            )}
            {c.transfer_status !== "none" && (
              <div className="mt-1.5">
                <TransferBadge status={c.transfer_status} />
              </div>
            )}
            {c.numbers_to_check.length > 0 && (
              <p
                className="mt-1.5 flex items-center gap-1.5 text-xs text-ember"
                title="The receptionist said these amounts but no tool provided them. Please verify."
              >
                <AlertTriangle size={13} aria-hidden /> Check numbers:{" "}
                {c.numbers_to_check.join(", ")}
              </p>
            )}
          </Td>
          <Td>
            <OutcomeBadge outcome={c.status === "completed" ? c.outcome : "in_progress"} />
          </Td>
          <Td>
            {c.urgent ? (
              <Badge dot tone="red">
                {label(c.emergency_type ?? "emergency")}
              </Badge>
            ) : (
              <span className="text-haze">—</span>
            )}
          </Td>
        </tr>
      ))}
    </Table>
  );
}
