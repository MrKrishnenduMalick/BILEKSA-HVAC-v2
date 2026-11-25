"use client";

import {
  Activity,
  AlertOctagon,
  Bell,
  Bot,
  CalendarClock,
  ChartSpline,
  ClipboardList,
  CreditCard,
  FileClock,
  Gauge,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PhoneCall,
  PlayCircle,
  Plug,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Siren,
  TrendingUp,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BRAND } from "@/config/brand";
import { DEMO } from "@/lib/demo";
import { Logo } from "./brand";
import { signOut, useSession } from "./session";
import { ToastProvider } from "./toast";

export type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title?: string; items: NavItem[] };

const CUSTOMER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/app", label: "Overview", icon: LayoutDashboard },
      { href: "/app/analytics", label: "Call analytics", icon: ChartSpline },
      { href: "/app/calls", label: "Call history", icon: PhoneCall },
      { href: "/app/customers", label: "Customers", icon: Users },
      { href: "/app/leads", label: "Leads", icon: Inbox },
      { href: "/app/callbacks", label: "Callbacks & appointments", icon: CalendarClock },
      ...(DEMO ? [{ href: "/app/try", label: "Try the receptionist", icon: PlayCircle }] : []),
    ],
  },
  {
    title: "Receptionist",
    items: [
      { href: "/app/receptionist", label: "AI receptionist", icon: Bot },
      { href: "/app/business", label: "Business profile", icon: ClipboardList },
      { href: "/app/services", label: "Services & pricing", icon: Wrench },
      { href: "/app/emergency", label: "Emergency rules", icon: Siren },
      { href: "/app/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/app/usage", label: "Usage", icon: Gauge },
      { href: "/app/packages", label: "Packages", icon: Package },
      { href: "/app/notifications", label: "Notifications", icon: Bell },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Clients", icon: LayoutDashboard },
      { href: "/admin/upgrades", label: "Upgrade requests", icon: TrendingUp },
      { href: "/admin/usage", label: "Usage & limits", icon: Gauge },
      { href: "/admin/packages", label: "Packages", icon: Package },
      { href: "/admin/costs", label: "Costs & profit", icon: CreditCard },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/vapi", label: "Vapi tools", icon: Activity },
      { href: "/admin/errors", label: "Errors", icon: AlertOctagon },
      { href: "/admin/audit", label: "Audit log", icon: FileClock },
      ...(DEMO ? [{ href: "/admin/demo", label: "Demo controls", icon: SlidersHorizontal }] : []),
    ],
  },
];

function isActive(href: string, root: string, pathname: string) {
  if (href === root) return pathname === root || pathname.startsWith("/admin/client");
  if (href === "/app/leads") return pathname.startsWith("/app/lead");
  return pathname.startsWith(href);
}

function Sidebar({ admin, onNavigate }: { admin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useSession();
  const groups = admin ? ADMIN_NAV : CUSTOMER_NAV;
  const root = admin ? "/admin" : "/app";
  const email = me.user.email ?? "";

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-5 pt-5">
        <Logo product={admin} />
        {admin && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-iris/10 px-2 py-1 text-[11px] font-semibold text-iris ring-1 ring-iris/25">
            <ShieldAlert size={12} aria-hidden /> {BRAND.productName} admin
          </p>
        )}
      </div>
      <nav aria-label="Main" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="px-3 pb-2 text-[11px] font-semibold text-haze">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, root, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${
                        active
                          ? "bg-white/[0.08] text-frost shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-mist hover:bg-white/[0.04] hover:text-frost"
                      }`}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]"
                          aria-hidden
                        />
                      )}
                      <Icon
                        size={17}
                        className={active ? "text-accent" : "text-haze group-hover:text-mist"}
                        aria-hidden
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/[0.07]">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-iris/60 to-accent/60 text-sm font-bold text-ink-950">
            {email.slice(0, 1).toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-frost">
              {me.business?.name ?? `${BRAND.productName} staff`}
            </p>
            <p className="truncate text-[11px] text-haze">{email}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-[13px]">
          {me.is_admin && !admin && (
            <Link
              href="/admin"
              className="rounded-lg px-2 py-1 text-mist hover:bg-white/5 hover:text-frost"
            >
              Admin area
            </Link>
          )}
          {admin && me.business && (
            <Link
              href="/app"
              className="rounded-lg px-2 py-1 text-mist hover:bg-white/5 hover:text-frost"
            >
              Customer view
            </Link>
          )}
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-left text-mist hover:bg-white/5 hover:text-frost"
            onClick={() => signOut(router)}
          >
            <LogOut size={14} aria-hidden /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  // The mobile menu belongs to the page it was opened on, so navigating closes it.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside className="glass sticky top-0 hidden h-screen w-[264px] shrink-0 border-y-0 border-l-0 lg:block">
          <Sidebar admin={admin} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="glass sticky top-0 z-30 flex items-center justify-between border-x-0 border-t-0 px-4 py-3 lg:hidden">
            <Logo product={admin} />
            <button
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-frost ring-1 ring-white/15"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen(true)}
            >
              <Menu size={16} aria-hidden /> Menu
            </button>
          </div>
          {open && (
            <div
              id="mobile-nav"
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
            >
              <button
                className="animate-fade absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div className="glass-strong animate-drawer absolute inset-y-0 left-0 w-[min(86vw,300px)]">
                <button
                  className="absolute right-3 top-5 rounded-lg p-1.5 text-haze hover:text-frost"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
                <Sidebar admin={admin} onNavigate={() => setOpen(false)} />
              </div>
            </div>
          )}
          <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-8 sm:py-9 xl:px-10">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
