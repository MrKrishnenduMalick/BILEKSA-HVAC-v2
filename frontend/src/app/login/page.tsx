"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, type Me } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { BRAND } from "@/config/brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      // BILEKSA staff without a client account go straight to the admin area.
      const me = await api<Me>("/api/me").catch(() => null);
      router.replace(me && me.is_admin && !me.business ? "/admin" : "/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sign in" subtitle={`Welcome back to ${BRAND.companyName}'s AI receptionist.`}>
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-mist hover:text-accent hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" loading={busy} size="lg" className="w-full">
          Sign in
        </Button>
        <p className="pt-2 text-center text-sm text-haze">
          New to {BRAND.productName}?{" "}
          <Link href="/contact" className="font-semibold text-accent hover:underline">
            Talk to our team
          </Link>
          . Accounts are set up by {BRAND.productName}.
        </p>
      </form>
    </AuthCard>
  );
}
