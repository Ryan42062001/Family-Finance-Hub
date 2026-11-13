import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { login, logout } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  // A leftover session must never look like a wrong-account sign-in (QA #108): say who is signed in and offer Sign out.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const signedInEmail = claimsData?.claims?.sub ? (typeof claimsData.claims.email === "string" ? claimsData.claims.email : "another account") : null;

  return (
    <main className="auth-shell auth-split">
      <aside className="auth-aside" aria-hidden="true">
        <span className="auth-aside-mark">FF</span>
        <p className="auth-aside-title">Your household&apos;s money, in one calm place.</p>
        <ul>
          <li>See where every dollar of income goes</li>
          <li>Plan and test what-ifs without touching saved data</li>
          <li>Private to your household</li>
        </ul>

      </aside>
      <section className="auth-card">
        {signedInEmail ? (
          <div className="auth-signed-in" role="status">
            <p>You&apos;re already signed in as <strong>{signedInEmail}</strong>.</p>
            <div className="auth-signed-in-actions"><Link className="secondary-button" href="/plan">Go to your plan</Link><form action={logout}><button className="secondary-button" type="submit">Sign out</button></form></div>
          </div>
        ) : null}
        <p className="eyebrow">Family Finance Hub</p>
        <h1>Sign in</h1>
        <p className="muted">Access only the household workspaces you belong to.</p>
        {params.error ? <p className="form-error">{params.error}</p> : null}
        {params.message ? <p className="form-success">{params.message}</p> : null}
        <form action={login} className="auth-form">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required minLength={8} />
          </label>
          <button type="submit">Sign in</button>
        </form>
        <p className="muted">
          New here? <Link href="/auth/sign-up">Create an account</Link>
        </p>
        <p className="muted auth-example-link">
          Curious first? <Link href="/demo">See an example household&apos;s plan</Link>
        </p>
      </section>
    </main>
  );
}
