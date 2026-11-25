import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { BRAND } from "@/config/brand";
import { CONTACT } from "@/lib/contact";
import { DEMO } from "@/lib/demo";

const marketing = BRAND.publicSite === "marketing";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/55 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Logo product={marketing} />
        <nav aria-label="Site" className="flex items-center gap-1 text-sm sm:gap-2">
          {DEMO && (
            <Link
              href="/demo"
              className="hidden rounded-lg px-3 py-2 font-semibold text-accent hover:text-frost sm:block"
            >
              Live demo
            </Link>
          )}
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 font-medium text-mist hover:text-frost"
          >
            Client sign in
          </Link>
          {marketing && (
            <Link
              href="/contact"
              className="rounded-xl bg-white/[0.08] px-3.5 py-2 font-semibold text-frost ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.12]"
            >
              Talk to BILEKSA
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-9 text-sm text-haze sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo product={marketing} />
        <p>Your HVAC Business. Your AI Receptionist. Based in {CONTACT.city}.</p>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-frost">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-frost">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-frost">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

/** Long-form text pages (privacy, terms). */
export function Prose({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-[32px] font-semibold tracking-[-0.025em] text-frost">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-7 text-mist [&_a]:text-accent [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-frost">
        {children}
      </div>
    </section>
  );
}
