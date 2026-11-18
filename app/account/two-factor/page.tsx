import Link from "next/link";
import { redirect } from "next/navigation";
import { EnrollTwoFactor, TurnOffTwoFactor } from "@/components/account/TwoFactorSetup";
import { readSecurityStatus } from "@/lib/auth/account-security";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// FFH-P08 Part B: optional authenticator-app two-factor sign-in for the signed-in person (R7).
export default async function TwoFactorSettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/auth/login");
  const status = await readSecurityStatus(supabase);
  if (!status?.sessionOk) redirect("/auth/login");

  return (
    <main className="page-shell account-page">
      <section className="hero-card">
        <div><p className="eyebrow">Account</p><h1>Two-factor sign-in</h1>
          <p className="muted">{status.twoFactorOn ? `On, with ${status.approvedFactorIds.length} authenticator${status.approvedFactorIds.length === 1 ? "" : "s"}.` : "Off."} Signing in will ask for a 6-digit code from an authenticator app on your phone.</p></div>
      </section>
      <section className="panel">
        <h2>{status.twoFactorOn ? "Add a backup authenticator" : "Turn it on"}</h2>
        {status.twoFactorOn ? <p className="muted">A second authenticator (for example on another phone) lets you sign in if you lose the first one.</p> : null}
        <EnrollTwoFactor twoFactorOn={status.twoFactorOn} />
      </section>
      {status.twoFactorOn ? (
        <section className="panel">
          <h2>Turn it off</h2>
          <p className="muted">Removes every authenticator from your account. Signing in will need only your password.</p>
          <TurnOffTwoFactor />
        </section>
      ) : null}
      <section className="panel">
        <h2>Lost your phone?</h2>
        <p className="muted">Use a backup authenticator if you added one. Otherwise the household owner can reset two-factor sign-in for you after confirming it&apos;s really you.</p>
        <p><Link href="/account">Back to account</Link></p>
      </section>
    </main>
  );
}
