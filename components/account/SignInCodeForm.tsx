"use client";
import { useActionState } from "react";
import { verifySignInCode, type FormState } from "@/app/account/security-actions";

export default function SignInCodeForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(verifySignInCode, { error: null });
  return (
    <form action={formAction} className="auth-form">
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <label>6-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></label>
      <button type="submit" disabled={pending}>{pending ? "Checking…" : "Continue"}</button>
    </form>
  );
}
