import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { Prose, SitePage } from "@/components/site";

export const metadata: Metadata = { title: "Terms of service" };

export default function Page() {
  return (
    <SitePage>
      <Prose title="Terms of service">
        <Alert tone="amber">
          This page must be written and approved by a lawyer before launch (plan assumption A12: AI
          disclosure, call recording and transcript consent, data retention).
        </Alert>
      </Prose>
    </SitePage>
  );
}
