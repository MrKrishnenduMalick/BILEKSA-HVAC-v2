import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { DEMO } from "@/lib/demo";

/** Shown on every page of the public demo so nobody mistakes it for a real client account. */
export function DemoBanner() {
  if (!DEMO) return null;
  return (
    <div
      className="relative z-40 border-b border-ember/25 bg-gradient-to-r from-ember/15 via-ember/10 to-ember/15 px-4 py-2 text-center text-[13px] text-[#ffe3b8] backdrop-blur"
      role="note"
    >
      <FlaskConical size={14} className="mr-1.5 inline -translate-y-px text-ember" aria-hidden />
      <strong className="font-semibold text-[#fff1da]">Public demo.</strong> Houston Comfort HVAC is
      a fictional company; data resets regularly and phone forwarding is turned off.{" "}
      <Link href="/demo" className="font-semibold text-[#fff1da] underline underline-offset-2">
        Demo sign-ins
      </Link>
    </div>
  );
}
