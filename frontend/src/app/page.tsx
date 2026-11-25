import {
  Building2,
  CalendarClock,
  Factory,
  Home as HomeIcon,
  MapPin,
  PhoneForwarded,
  ShieldCheck,
  Siren,
  Sparkles,
  Wrench,
} from "lucide-react";
import LoginPage from "./login/page";
import { SitePage } from "@/components/site";
import { ButtonLink } from "@/components/ui";
import { BRAND } from "@/config/brand";
import { DEMO } from "@/lib/demo";

const TRANSCRIPT: { who: "ai" | "caller" | "tool"; text: string }[] = [
  {
    who: "ai",
    text: "Thank you for calling Houston Comfort HVAC, this is the AI receptionist. How can I help?",
  },
  {
    who: "caller",
    text: "Our AC is blowing warm air and it's 98 degrees. Do you come out to 77002?",
  },
  { who: "tool", text: "Service area checked: 77002 is covered" },
  {
    who: "ai",
    text: "Yes, 77002 is in our area. AC repair runs $89 to $450. What's the best number to reach you?",
  },
  { who: "caller", text: "713 555 0142." },
  { who: "tool", text: "Lead saved, appointment requested" },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Knows your business",
    text: "Quotes only the services, price ranges, hours and ZIP codes you approve. No guessing, ever.",
  },
  {
    icon: CalendarClock,
    title: "Captures real leads",
    text: "Name, address, the HVAC problem, urgency and a confirmed callback number, saved while the caller talks.",
  },
  {
    icon: PhoneForwarded,
    title: "Callbacks and transfers",
    text: "Transfers to your team when you allow it, or takes a callback request without promising times.",
  },
  {
    icon: MapPin,
    title: "Keep your number",
    text: "Forward your existing business line. Nothing changes for your customers.",
  },
];

const SEGMENTS = [
  {
    icon: HomeIcon,
    title: "Residential",
    text: "AC, furnaces, heat pumps, mini-splits, tune-ups and air quality.",
  },
  {
    icon: Building2,
    title: "Commercial",
    text: "Rooftop units, VRF, maintenance contracts, restaurants and walk-in coolers.",
  },
  {
    icon: Factory,
    title: "Industrial",
    text: "Process cooling and plant ventilation, routed to your specialists.",
  },
];

const STEPS = [
  [
    "Talk to BILEKSA",
    "Tell us about your business. We recommend the right package for your call volume.",
  ],
  [
    "We set everything up",
    "Services, hours, service areas, transfer and emergency rules, configured and tested by our team.",
  ],
  [
    "Forward your line",
    "Forward your existing number, place a test call, and go live once it's verified.",
  ],
];

function LiveCall() {
  return (
    <div className="glass-strong relative rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center gap-4 border-b border-white/[0.07] pb-4">
        <div className="orb h-12 w-12 shrink-0" data-state="live" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-frost">Incoming call, answered in 1 ring</p>
          <p className="text-xs text-haze">Houston Comfort HVAC, AI receptionist</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-leaf/10 px-2.5 py-1 text-[11px] font-semibold text-leaf ring-1 ring-leaf/25">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-leaf" /> Live
        </span>
      </div>
      <ol className="mt-4 space-y-3" aria-label="Example call">
        {TRANSCRIPT.map((line, i) => (
          <li key={i} className="animate-rise" style={{ animationDelay: `${0.35 + i * 0.55}s` }}>
            {line.who === "tool" ? (
              <p className="flex items-center gap-2 pl-1 text-xs font-medium text-accent">
                <Sparkles size={13} aria-hidden /> {line.text}
              </p>
            ) : (
              <div className={line.who === "caller" ? "flex justify-end" : "flex"}>
                <p
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-6 ${
                    line.who === "caller"
                      ? "rounded-br-md bg-white/[0.08] text-frost"
                      : "rounded-bl-md bg-accent/[0.12] text-frost ring-1 ring-accent/20"
                  }`}
                >
                  <span className="sr-only">
                    {line.who === "caller" ? "Caller: " : "Receptionist: "}
                  </span>
                  {line.text}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Marketing() {
  return (
    <SitePage>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-[13px] font-medium text-mist ring-1 ring-white/10">
            <Wrench size={14} className="text-accent" aria-hidden /> Built for HVAC contractors
          </p>
          <h1 className="mt-6 text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-frost sm:text-[60px]">
            <span className="text-gradient">Your HVAC Business.</span>
            <br />
            Your AI Receptionist.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-8 text-mist">
            Never miss an important business call again. {BRAND.productName} answers every call,
            captures every lead and gets urgent jobs to your team, without you touching any
            technical setup.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {DEMO && (
              <ButtonLink href="/demo" size="lg">
                Try the live demo
              </ButtonLink>
            )}
            <ButtonLink href="/contact" size="lg" variant={DEMO ? "secondary" : "primary"}>
              Talk to BILEKSA
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="ghost">
              Client sign in
            </ButtonLink>
          </div>
        </div>
        <LiveCall />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="glass relative overflow-hidden rounded-[28px] p-7 sm:p-10">
          <div
            className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, #ff5c7a, transparent 65%)" }}
            aria-hidden
          />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-signal/15 text-signal ring-1 ring-signal/30">
                <Siren size={22} aria-hidden />
              </span>
              <h2 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-frost">
                Emergencies are escalated the moment they&apos;re said
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-mist">
                Gas smells, carbon monoxide alarms, smoke, sparks, refrigerant leaks and failing
                walk-in coolers are recognised instantly. Your team is alerted and an urgent
                callback is booked before the safety advice is even finished, so nothing is lost if
                the caller hangs up to leave the building.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                ["Recognised", "“I smell gas by the furnace.”"],
                ["Escalated", "Owner alerted, urgent callback requested"],
                ["Kept safe", "Short, fixed safety steps; transfer when allowed"],
              ].map(([t, d], i) => (
                <li key={t} className="glass-inset rounded-2xl p-4">
                  <p className="num text-xs font-semibold text-signal">Step {i + 1}</p>
                  <p className="mt-2 font-semibold text-frost">{t}</p>
                  <p className="mt-1 text-sm leading-6 text-mist">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-frost">
              A receptionist that sounds like it works for you
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-mist">
              Short, natural answers. One question at a time. It never asks twice for something the
              caller already said, and it never invents a price or an arrival time.
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Icon size={18} aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-frost">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-mist">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-frost">
          The whole HVAC industry, not just AC repair
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {SEGMENTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass rounded-[var(--radius-panel)] p-6">
              <Icon size={22} className="text-iris" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-frost">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-mist">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="glass rounded-[28px] p-7 sm:p-10">
          <h2 className="text-[28px] font-semibold tracking-[-0.025em] text-frost">
            Live in three steps
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <span className="num grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-accent to-iris text-sm font-bold text-ink-950">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-frost">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-mist">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3 border-t border-white/[0.07] pt-8">
            <ButtonLink href="/contact">Talk to BILEKSA</ButtonLink>
            {DEMO && (
              <ButtonLink href="/demo" variant="secondary">
                Try the live demo
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
    </SitePage>
  );
}

/** Master repo and public demo show the sales site; a client deployment opens on sign-in. */
export default function Home() {
  return BRAND.publicSite === "login" ? <LoginPage /> : <Marketing />;
}
