import { ShieldCheck, Siren, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { BRAND } from "@/config/brand";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Logo product={BRAND.publicSite === "marketing"} />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-frost">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-6 text-mist">{subtitle}</p>}
          <div className="animate-rise mt-8">{children}</div>
        </div>
        <p className="text-xs text-haze">
          Protected sign-in. {BRAND.productName} staff never ask for your password.
        </p>
      </div>
      <aside className="relative hidden overflow-hidden p-6 lg:block">
        <div className="glass relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] p-10">
          <div
            className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent), transparent 62%)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full opacity-35 blur-3xl"
            style={{ background: "radial-gradient(circle, #8b93ff, transparent 62%)" }}
            aria-hidden
          />
          <div className="orb relative h-28 w-28" data-state="live" aria-hidden />
          <div className="relative">
            <p className="max-w-md text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-frost">
              Every call answered. Every lead captured.
            </p>
            <ul className="mt-8 space-y-4 text-[15px] text-mist">
              {[
                [Sparkles, "Your receptionist answers day and night with your approved answers"],
                [Siren, "Emergencies reach your team the moment they're reported"],
                [ShieldCheck, "Your data stays in your own private deployment"],
              ].map(([Icon, text]) => {
                const I = Icon as typeof Siren;
                return (
                  <li key={text as string} className="flex items-start gap-3">
                    <I size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {text as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>
    </main>
  );
}
