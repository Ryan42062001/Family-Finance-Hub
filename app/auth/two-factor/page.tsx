import SignInCodeForm from "@/components/account/SignInCodeForm";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

// FFH-P08 sign-in step 2. The proxy sends only sessions that still need their code here.
export default function TwoFactorSignInPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Family Finance Hub</p>
        <h1>Enter your code</h1>
        <p className="muted">Open your authenticator app and enter the 6-digit code for Family Finance Hub.</p>
        <SignInCodeForm />
        <p className="muted">Lost your phone? Use a backup authenticator, or ask the household owner to reset two-factor sign-in.</p>
        <form action={logout}><button className="secondary-button" type="submit">Sign out</button></form>
      </section>
    </main>
  );
}
