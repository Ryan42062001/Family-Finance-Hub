"use client";
import { useActionState } from "react";
import { deleteAccount, type FormState } from "@/app/account/security-actions";

// FFH-P08 Part C. Password (+ code) re-entry and typed DELETE; the database checks all of it again.
export default function DeleteAccountForm({ twoFactorOn }: { twoFactorOn: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(deleteAccount, { error: null });
  return (
    <form action={formAction} className="auth-form account-form">
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <label>Your password<input name="password" type="password" autoComplete="current-password" required /></label>
      {twoFactorOn ? <label>Code from your authenticator app<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label> : null}
      <label>Type DELETE to confirm<input name="confirm" autoComplete="off" required pattern="DELETE" /></label>
      <button type="submit" className="danger-button" disabled={pending}>{pending ? "Deleting…" : "Permanently delete my account"}</button>
    </form>
  );
}
