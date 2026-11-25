"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, Search, X, XCircle } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { LucideIcon } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ── surfaces ─────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx("glass rounded-[var(--radius-panel)]", padded && "p-5 sm:p-6", className)}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-accent ring-1 ring-white/10">
            <Icon size={17} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-frost">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] leading-5 text-haze">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="animate-rise mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-frost sm:text-[30px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-mist">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

/** Section heading inside a page (h2), e.g. a tab of the admin client screen. */
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-frost">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-mist">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── buttons ──────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "danger" | "ghost";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px";
const btnVariant: Record<Variant, string> = {
  primary:
    "bg-accent text-ink-950 shadow-[0_10px_30px_-12px_var(--accent)] hover:brightness-110 hover:shadow-[0_14px_34px_-10px_var(--accent)]",
  secondary:
    "bg-white/[0.06] text-frost ring-1 ring-inset ring-white/12 hover:bg-white/[0.1] hover:ring-white/20",
  danger: "bg-signal/10 text-[#ff9db0] ring-1 ring-inset ring-signal/30 hover:bg-signal/20",
  ghost: "text-mist hover:bg-white/[0.06] hover:text-frost",
};
const btnSize = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4", lg: "h-12 px-6 text-[15px]" };

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof btnSize;
  icon?: LucideIcon;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  loading,
  className = "",
  children,
  ...props
}: BtnProps) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(btnBase, btnVariant[variant], btnSize[size], className)}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={16} aria-hidden />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: keyof typeof btnSize;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(btnBase, btnVariant[variant], btnSize[size], className)}>
      {Icon && <Icon size={16} aria-hidden />}
      {children}
    </Link>
  );
}

/* ── forms ────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-mist">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 block text-xs leading-5 text-haze">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-950/50 px-3.5 py-2.5 text-sm text-frost placeholder:text-haze/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition focus:border-accent/60 focus:bg-ink-950/70 focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-24 leading-6", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        inputCls,
        "appearance-none bg-[length:16px] bg-[right_0.8rem_center] bg-no-repeat pr-9",
        props.className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2373839e' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")",
        ...props.style,
      }}
    />
  );
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-frost">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-white/20 bg-ink-950 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-haze"
        aria-hidden
      />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(inputCls, "pl-10")}
      />
    </div>
  );
}

/** Pill tabs / segmented filter. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
            value === o.value
              ? "bg-white/[0.12] text-frost shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "text-haze hover:text-frost",
          )}
        >
          {o.label}
          {o.count != null && <span className="num ml-1.5 text-haze">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── status ───────────────────────────────────────────────── */

const badgeTones = {
  green: "bg-leaf/10 text-[#7ee8c0] ring-leaf/25",
  blue: "bg-iris/10 text-[#b8bdff] ring-iris/25",
  amber: "bg-ember/10 text-[#ffd08a] ring-ember/25",
  red: "bg-signal/12 text-[#ffa3b5] ring-signal/30",
  gray: "bg-white/[0.06] text-mist ring-white/12",
  teal: "bg-accent/10 text-accent ring-accent/25",
};
export type Tone = keyof typeof badgeTones;

export function Badge({
  tone = "gray",
  children,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        badgeTones[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const alertTone = {
  red: { cls: "border-signal/30 bg-signal/[0.08] text-[#ffc2ce]", Icon: XCircle },
  amber: { cls: "border-ember/30 bg-ember/[0.08] text-[#ffe0ad]", Icon: AlertTriangle },
  blue: { cls: "border-iris/30 bg-iris/[0.08] text-[#d3d6ff]", Icon: Info },
  green: { cls: "border-leaf/30 bg-leaf/[0.08] text-[#b6f3da]", Icon: CheckCircle2 },
};

export function Alert({
  tone = "red",
  children,
}: {
  tone?: keyof typeof alertTone;
  children: ReactNode;
}) {
  const { cls, Icon } = alertTone[tone];
  return (
    <div
      role={tone === "red" ? "alert" : "status"}
      className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6", cls)}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="space-y-3 py-2" aria-label={`${label}…`}>
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cx("skeleton rounded-lg", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading…" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-panel)]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[var(--radius-panel)]" />
    </div>
  );
}

export function Empty({
  title,
  children,
  icon: Icon,
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-haze ring-1 ring-white/10">
          <Icon size={22} aria-hidden />
        </span>
      )}
      <p className="font-semibold text-frost">{title}</p>
      {children && <p className="mt-1.5 max-w-sm text-sm leading-6 text-haze">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center py-8 text-center">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-signal/10 text-signal ring-1 ring-signal/25">
          <XCircle size={22} aria-hidden />
        </span>
        <p className="font-semibold text-frost">This page couldn&apos;t load</p>
        <p className="mt-1.5 max-w-md text-sm text-haze">{message}</p>
        {onRetry && (
          <Button variant="secondary" className="mt-5" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ── data ─────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  tone = "teal",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  delta?: number | null;
  tone?: "teal" | "iris" | "ember" | "signal" | "leaf";
  children?: ReactNode;
}) {
  const toneCls = {
    teal: "text-accent bg-accent/10 ring-accent/20",
    iris: "text-iris bg-iris/10 ring-iris/20",
    ember: "text-ember bg-ember/10 ring-ember/20",
    signal: "text-signal bg-signal/10 ring-signal/20",
    leaf: "text-leaf bg-leaf/10 ring-leaf/20",
  }[tone];
  return (
    <div className="glass group relative overflow-hidden rounded-[var(--radius-panel)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-mist">{label}</p>
        {Icon && (
          <span className={cx("grid h-8 w-8 place-items-center rounded-lg ring-1", toneCls)}>
            <Icon size={15} aria-hidden />
          </span>
        )}
      </div>
      <p data-stat={label} className="num mt-2 text-[28px] font-semibold leading-none text-frost">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-haze">
        {delta != null && Number.isFinite(delta) && (
          <span
            className={cx(
              "num rounded-md px-1.5 py-0.5 font-semibold",
              delta >= 0 ? "bg-leaf/10 text-leaf" : "bg-signal/10 text-signal",
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        {hint && <span className="truncate">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Table({
  head,
  children,
  minWidth = 640,
}: {
  head: ReactNode[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-white/[0.07] text-xs text-haze">
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2.5 font-medium first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05] [&>tr]:transition-colors [&>tr:hover]:bg-white/[0.025]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <td
      className={cx(
        "px-3 py-3 align-top text-frost/90 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-haze">{k}</dt>
          <dd className="mt-1 break-words text-sm text-frost">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({
  items,
}: {
  items: { title: ReactNode; detail?: ReactNode; meta?: ReactNode; tone?: Tone }[];
}) {
  const dot: Record<Tone, string> = {
    green: "bg-leaf",
    blue: "bg-iris",
    amber: "bg-ember",
    red: "bg-signal",
    gray: "bg-haze",
    teal: "bg-accent",
  };
  return (
    <ol className="relative space-y-5 pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-white/10">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span
            className={cx(
              "absolute -left-6 top-1.5 h-[15px] w-[15px] rounded-full border-[3px] border-ink-900",
              dot[it.tone ?? "teal"],
            )}
            aria-hidden
          />
          <p className="text-sm font-semibold text-frost">{it.title}</p>
          {it.detail && <p className="mt-0.5 text-sm leading-6 text-mist">{it.detail}</p>}
          {it.meta && <p className="mt-0.5 text-xs text-haze">{it.meta}</p>}
        </li>
      ))}
    </ol>
  );
}

/* ── overlays ─────────────────────────────────────────────── */

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return <DrawerInner {...{ onClose, title, subtitle, children, footer }} />;
}

function DrawerInner({
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(onClose);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button
        aria-label="Close panel"
        className="animate-fade absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="glass-strong animate-drawer absolute inset-y-0 right-0 flex w-full max-w-xl flex-col sm:inset-y-3 sm:right-3 sm:rounded-[var(--radius-panel)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-semibold tracking-tight text-frost">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-haze">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="border-t border-white/[0.07] px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return <ModalInner {...{ onClose, title, children }} />;
}

function ModalInner({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEscape(onClose);
  const id = useId();
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
    >
      <button
        aria-label="Close dialog"
        className="animate-fade absolute inset-0 bg-ink-950/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-strong animate-rise relative w-full max-w-md rounded-[var(--radius-panel)] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={id} className="text-lg font-semibold tracking-tight text-frost">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
