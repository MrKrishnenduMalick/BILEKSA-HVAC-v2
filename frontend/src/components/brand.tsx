import Link from "next/link";
import { BRAND } from "@/config/brand";

/** The client's mark (client/branding/logo.*) or a built-in monogram. */
export function Mark({ size = 34 }: { size?: number }) {
  if (BRAND.logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={BRAND.logo} alt="" width={size} height={size} className="rounded-xl" />;
  return (
    <span
      className="grid place-items-center rounded-xl bg-gradient-to-br from-accent to-iris font-bold text-ink-950"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {BRAND.companyName.slice(0, 1)}
    </span>
  );
}

export function Logo({ light = true, product = false }: { light?: boolean; product?: boolean }) {
  const name = product ? BRAND.productName : BRAND.companyName;
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${name} home`}>
      <Mark />
      <span className="min-w-0 leading-tight">
        <span
          className={`block truncate text-[15px] font-bold tracking-tight ${light ? "text-frost" : "text-ink-950"}`}
        >
          {name}
        </span>
        {!product && (
          <span className="block truncate text-[11px] font-medium text-haze">
            AI receptionist by {BRAND.productName}
          </span>
        )}
      </span>
    </Link>
  );
}
