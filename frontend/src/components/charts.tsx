"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/* Lightweight SVG charts (no chart library): responsive, keyboard-free hover tooltips,
   honest axes starting at zero, and labels a person can read without a legend hunt. */

export type SeriesDef = { key: string; label: string; color: string };
type Point = Record<string, number | string>;

const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Smoothed area/line chart for one or more series over days. */
export function AreaChart({
  data,
  series,
  height = 240,
  xKey = "date",
  formatX = shortDate,
}: {
  data: Point[];
  series: SeriesDef[];
  height?: number;
  xKey?: string;
  formatX?: (v: string) => string;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real container width so labels stay a readable size in narrow cards.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 36, r: 12, t: 14, b: 26 };
  const max = useMemo(
    () => niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)))),
    [data, series],
  );
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = (key: string) => {
    const pts = data.map((d, i) => [x(i), y(Number(d[key]) || 0)] as const);
    if (pts.length < 2) return "";
    let p = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      p += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return p;
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const every = Math.max(1, Math.ceil(data.length / Math.max(3, Math.floor(W / 110))));

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Chart of ${series.map((s) => s.label).join(" and ")}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
          setHover(Math.min(data.length - 1, Math.max(0, i)));
        }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.32" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray={t === 0 ? undefined : "3 5"}
            />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#73839e">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          (i % every === 0 && data.length - 1 - i >= every / 2) || i === data.length - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fontSize="11"
              fill="#73839e"
            >
              {formatX(String(d[xKey]))}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const line = path(s.key);
          if (!line) return null;
          return (
            <g key={s.key}>
              <path
                d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={`url(#${uid}-${s.key})`}
              />
              <path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={H - pad.b}
              stroke="rgba(255,255,255,0.18)"
            />
            {series.map((s) => (
              <circle
                key={s.key}
                cx={x(hover)}
                cy={y(Number(data[hover][s.key]) || 0)}
                r="4.5"
                fill="#0a1222"
                stroke={s.color}
                strokeWidth="2.5"
              />
            ))}
          </g>
        )}
      </svg>
      {hover != null && data[hover] && (
        <div
          className="glass-strong pointer-events-none absolute top-2 rounded-xl px-3 py-2 text-xs"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${x(hover) > W * 0.7 ? "-105%" : "8%"})`,
          }}
        >
          <p className="mb-1 font-semibold text-frost">{formatX(String(data[hover][xKey]))}</p>
          {series.map((s) => (
            <p key={s.key} className="num flex items-center gap-2 text-mist">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              <span className="ml-auto pl-3 font-semibold text-frost">{data[hover][s.key]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-mist">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Vertical bars (e.g. calls by hour of day). */
export function BarChart({
  data,
  color = "var(--accent)",
  height = 180,
  label,
}: {
  data: { label: string; value: number; title?: string }[];
  color?: string;
  height?: number;
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={label}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className="w-full rounded-t-[5px] transition-[filter] group-hover:brightness-125"
              style={{
                height: `${Math.max(d.value ? 4 : 1.5, (d.value / max) * 100)}%`,
                background: d.value
                  ? `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 35%, transparent))`
                  : "rgba(255,255,255,0.06)",
              }}
            />
            {hover === i && (
              <div className="glass-strong num pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs text-frost">
                {d.title ?? d.label}: <b>{d.value}</b>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[10px] text-haze">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {i % Math.ceil(data.length / 8) === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut with a centred total and a readable legend beside it. */
export function Donut({
  parts,
  total,
  centerLabel,
  size = 168,
}: {
  parts: { label: string; value: number; color: string }[];
  total?: number;
  centerLabel: string;
  size?: number;
}) {
  const sum = parts.reduce((a, p) => a + p.value, 0);
  const r = 15.9155;
  let offset = 25;
  return (
    <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 42 42"
          className="h-full w-full -rotate-0"
          role="img"
          aria-label={centerLabel}
        >
          <circle
            cx="21"
            cy="21"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4.2"
          />
          {sum > 0 &&
            parts.map((p) => {
              const pct = (p.value / sum) * 100;
              const el = (
                <circle
                  key={p.label}
                  cx="21"
                  cy="21"
                  r={r}
                  fill="none"
                  stroke={p.color}
                  strokeWidth="4.2"
                  strokeDasharray={`${Math.max(0, pct - 0.6)} ${100 - Math.max(0, pct - 0.6)}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                />
              );
              offset -= pct;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-2xl font-semibold text-frost">{total ?? sum}</p>
            <p className="text-[11px] text-haze">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ background: p.color }} />
            <span className="min-w-0 truncate text-mist">{p.label}</span>
            <span className="num ml-auto font-semibold text-frost">{p.value}</span>
            <span className="num w-10 text-right text-xs text-haze">
              {sum ? Math.round((p.value / sum) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ring meter for minutes used. */
export function Meter({
  percent,
  size = 132,
  label,
  children,
}: {
  percent: number;
  size?: number;
  label: string;
  children?: React.ReactNode;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  const color = pct >= 100 ? "#ff5c7a" : pct >= 80 ? "#f5a524" : "var(--accent)";
  const r = 15.9155;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="3.4"
        />
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray={`${pct} ${100 - pct}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Tiny trend line for KPI cards. */
export function Sparkline({
  values,
  color = "var(--accent)",
}: {
  values: number[];
  color?: string;
}) {
  const uid = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const W = 120;
  const H = 32;
  const pts = values.map((v, i) => [(i * W) / (values.length - 1), H - 2 - (v / max) * (H - 4)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 h-8 w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${uid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
