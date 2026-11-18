import Link from "next/link";

// FFH-P08: fixed page after an account is deleted. Public; reads nothing.
export default function AccountDeletedPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Family Finance Hub</p>
        <h1>Your account was deleted</h1>
        <p className="muted">Your sign-in has been removed and you have been signed out.</p>
        <p><Link href="/auth/login">Back to sign in</Link></p>
      </section>
    </main>
  );
}
