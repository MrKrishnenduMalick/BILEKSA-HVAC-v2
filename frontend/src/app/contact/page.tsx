import type { Metadata } from "next";
import { SitePage } from "@/components/site";
import { CONTACT } from "@/lib/contact";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <SitePage>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold text-navy">Talk to BILEKSA</h1>
        <p className="mt-3 text-mist">
          Want an AI receptionist for your HVAC business? Tell us about your call volume and
          we&apos;ll recommend a package and set everything up for you. We reply within one business
          day.
        </p>
        <div className="glass mt-8 rounded-2xl p-6">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs tracking-normal text-haze">Email</dt>
              <dd className="mt-1">
                <a
                  className="font-medium text-accent hover:underline"
                  href={`mailto:${CONTACT.email}`}
                >
                  {CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-normal text-haze">Based in</dt>
              <dd className="mt-1">{CONTACT.city}</dd>
            </div>
          </dl>
        </div>
      </section>
    </SitePage>
  );
}
