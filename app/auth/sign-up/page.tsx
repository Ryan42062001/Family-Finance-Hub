import Link from "next/link";
import { signUp } from "../actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
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
      </section>
    </main>
  );
}
