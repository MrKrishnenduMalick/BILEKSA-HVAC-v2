"use client";

import { KeyRound, LifeBuoy, UserRound } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  KeyValue,
  PageHeader,
} from "@/components/ui";
import { BRAND } from "@/config/brand";
import { DEMO } from "@/lib/demo";
import { getSupabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { me } = useSession();
  const { notify } = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) return setError("Use at least 10 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    setPw("");
    setPw2("");
    notify("Password changed");
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your sign-in and how to reach support." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={UserRound} title="Account" />
          <KeyValue
            items={[
              ["Signed in as", me.user.email],
              ["Business", me.business?.name],
              ["Role", me.is_admin ? `${BRAND.productName} admin` : "Business owner"],
              ["Alerts sent to", me.business?.notification_email ?? me.business?.contact_email],
            ]}
          />
        </Card>
        <Card>
          <CardHeader
            icon={KeyRound}
            title="Change password"
            subtitle={"You'll stay signed in on this device."}
          />
          {DEMO ? (
            <Alert tone="blue">Passwords can&apos;t be changed in the public demo.</Alert>
          ) : (
            <form onSubmit={changePassword} className="space-y-4">
              {error && <Alert>{error}</Alert>}
              <Field label="New password" hint="At least 10 characters">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                />
              </Field>
              <Field label="Repeat new password">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" loading={busy}>
                Change password
              </Button>
            </form>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            icon={LifeBuoy}
            title="Changes and support"
            subtitle="Services, prices, hours, routing and emergency rules are set up and tested by BILEKSA."
          />
          <p className="text-sm text-mist">
            Email{" "}
            <a
              className="font-semibold text-accent hover:underline"
              href={`mailto:${BRAND.supportEmail}`}
            >
              {BRAND.supportEmail}
            </a>
            {BRAND.supportPhone ? ` or call ${BRAND.supportPhone}` : ""} with any change you need.
          </p>
        </Card>
      </div>
    </>
  );
}
