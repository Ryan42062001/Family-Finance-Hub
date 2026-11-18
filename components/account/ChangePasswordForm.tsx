"use client";
import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/account/security-actions";

// FFH-P08 Part A. Shows only fixed messages returned by the server action.
export default function ChangePasswordForm({ twoFactorOn }: { twoFactorOn: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, { error: null });
  return (
    <form action={formAction} className="auth-form account-form">
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <label>Current password<input name="current_password" type="password" autoComplete="current-password" required /></label>
      <label>New password<input name="new_password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
      <label>New password again<input name="confirm_password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
      {twoFactorOn ? <label>Code from your authenticator app<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label> : null}
      <p className="muted">At least 12 characters. You&apos;ll be signed out on every device and sign in again with the new password.</p>
      <button type="submit" disabled={pending}>{pending ? "Changing…" : "Change password"}</button>
    </form>
  );
}
