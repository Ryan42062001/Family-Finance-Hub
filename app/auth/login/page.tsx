import Link from "next/link";
import { login } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

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
