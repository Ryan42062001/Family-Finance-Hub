"use client";
import { useActionState } from "react";
import {
  confirmTwoFactorEnrollment,
  startTwoFactorEnrollment,
  turnOffTwoFactor,
  type EnrollState,
  type FormState,
} from "@/app/account/security-actions";

const codeInput = { inputMode: "numeric" as const, autoComplete: "one-time-code", pattern: "[0-9]{6}", maxLength: 6, required: true };

// FFH-P08 Part B. The QR code and setup key exist only in this page's memory, shown once.
export function EnrollTwoFactor({ twoFactorOn }: { twoFactorOn: boolean }) {
  const [enroll, startAction, starting] = useActionState<EnrollState, FormData>(startTwoFactorEnrollment, { factorId: null, qr: null, secret: null, error: null });
  const [confirm, confirmAction, confirming] = useActionState<FormState, FormData>(confirmTwoFactorEnrollment, { error: null });
  if (!enroll.factorId) {
    return (
      <form action={startAction} className="auth-form account-form">
        {enroll.error ? <p className="form-error" role="alert">{enroll.error}</p> : null}
        <button type="submit" disabled={starting}>{starting ? "Starting…" : twoFactorOn ? "Add another authenticator" : "Set up an authenticator app"}</button>
      </form>
    );
  }
  return (
    <form action={confirmAction} className="auth-form account-form">
      <ol className="two-factor-steps">
        <li>Scan this code with your authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password).
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the provider, shown once */}
          {enroll.qr ? <img className="two-factor-qr" src={enroll.qr} alt="QR code for your authenticator app" width={180} height={180} /> : null}
        </li>
        <li>Can&apos;t scan? Enter this setup key instead: <code className="two-factor-secret">{enroll.secret}</code></li>
      </ol>
      {confirm.error ? <p className="form-error" role="alert">{confirm.error}</p> : null}
      <input type="hidden" name="factor_id" value={enroll.factorId} />
      <label>Code from the new authenticator<input name="new_code" {...codeInput} /></label>
      {twoFactorOn ? <label>Code from an authenticator you already use<input name="existing_code" {...codeInput} /></label> : null}
      <label>Your password<input name="password" type="password" autoComplete="current-password" required /></label>
      <p className="muted">You&apos;ll be signed out everywhere and sign in again with your password and a code.</p>
      <button type="submit" disabled={confirming}>{confirming ? "Checking…" : "Turn on"}</button>
    </form>
  );
}

export function TurnOffTwoFactor() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(turnOffTwoFactor, { error: null });
  return (
    <form action={formAction} className="auth-form account-form">
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <label>Your password<input name="password" type="password" autoComplete="current-password" required /></label>
      <label>Code from your authenticator app<input name="code" {...codeInput} /></label>
      <button type="submit" className="danger-button" disabled={pending}>{pending ? "Turning off…" : "Turn off two-factor sign-in"}</button>
    </form>
  );
}
