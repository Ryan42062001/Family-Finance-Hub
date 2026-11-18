import Link from "next/link";
import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import { readSecurityStatus } from "@/lib/auth/account-security";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// FFH-P08: the signed-in person's own account settings. Shows nothing about anyone else.
export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/auth/login");
  const status = await readSecurityStatus(supabase);
  if (!status?.sessionOk) redirect("/auth/login");
  const email = typeof claims.claims.email === "string" ? claims.claims.email : "your account";

  return (
    <main className="page-shell account-page">
      <section className="hero-card">
        <div><p className="eyebrow">Account</p><h1>Account &amp; security</h1><p className="muted">Signed in as <b className="account-email">{email}</b>.</p></div>
      </section>

      <section className="panel" aria-labelledby="password-heading">
        <h2 id="password-heading">Change password</h2>
        <ChangePasswordForm twoFactorOn={status.twoFactorOn} />
      </section>

      <section className="panel" aria-labelledby="two-factor-heading">
        <h2 id="two-factor-heading">Two-factor sign-in</h2>
        <p>{status.twoFactorOn ? "On. Signing in asks for a code from your authenticator app." : "Off. Add an authenticator app so a stolen password alone can't get in."}</p>
        {status.unapprovedFactor ? <p className="form-error" role="status">An authenticator was added to this account outside Family Finance Hub. If that wasn&apos;t you, change your password and ask the household owner for a two-factor reset.</p> : null}
        <Link className="secondary-button" href="/account/two-factor">{status.twoFactorOn ? "Manage two-factor sign-in" : "Turn on two-factor sign-in"}</Link>
      </section>

      <section className="panel" aria-labelledby="delete-heading">
        <h2 id="delete-heading">Delete account</h2>
        <p className="muted">Permanently removes your sign-in. This can&apos;t be undone.</p>
        <Link className="danger-button" href="/account/delete">Delete my account…</Link>
      </section>
    </main>
  );
}
