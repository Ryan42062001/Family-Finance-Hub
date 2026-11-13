import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout, signUp } from "../actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
        <h1>Create your account</h1>
        <p className="muted">Your account starts private. Household access is granted explicitly.</p>
        {params.error ? <p className="form-error">{params.error}</p> : null}
        <form action={signUp} className="auth-form">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <button type="submit">Create account</button>
        </form>
        <p className="muted">
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </p>
        <p className="muted auth-example-link">
          Curious first? <Link href="/demo">See an example household&apos;s plan</Link>
        </p>
      </section>
    </main>
  );
}
