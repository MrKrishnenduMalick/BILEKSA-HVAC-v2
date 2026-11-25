import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { DemoBanner } from "@/components/demo-banner";
import { BRAND } from "@/config/brand";

const title =
  BRAND.publicSite === "login"
    ? `${BRAND.companyName} · AI receptionist`
    : `${BRAND.productName} HVAC · Your AI receptionist`;

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s · ${BRAND.publicSite === "login" ? BRAND.companyName : BRAND.productName}`,
  },
  description:
    "Your HVAC Business. Your AI Receptionist. Never miss an important business call again.",
  icons: BRAND.logo ? { icon: BRAND.logo } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{ "--accent": BRAND.accent } as CSSProperties}
    >
      <body className="flex min-h-full flex-col">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
