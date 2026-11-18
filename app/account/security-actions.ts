"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GENERIC_FAILURE,
  endThrowaway,
  field,
  isTotpCode,
  isUuid,
  newPasswordProblem,
  readSecurityStatus,
  reauthenticate,
  verifyAnyApprovedFactor,
} from "@/lib/auth/account-security";

// FFH-P08 account security actions. Identity always comes from the signed-in session, never from a form field.
// Provider error text is never shown; only fixed messages.

export type FormState = { error: string | null };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/auth/login");
  return supabase;
}

// Part A: change password. Current password (and a code when two-factor sign-in is on) re-checked on a throw-away
// session; the provider itself also requires the current password (R9). Every session then ends, including this one.
export async function changePassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const real = await signedIn();
  const current = field(formData, "current_password");
  const next = field(formData, "new_password");
  const confirm = field(formData, "confirm_password");
  const code = field(formData, "code", 6) || null;

  const problem = newPasswordProblem(next, confirm, current);
  if (problem) return { error: problem };

  const proof = await reauthenticate(real, current, code);
  if (!proof.ok) return { error: GENERIC_FAILURE };

  const { error: updateError } = await proof.client.auth.updateUser({ password: next, current_password: current });
  if (updateError) {
    await endThrowaway(proof.client);
    if (updateError.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    if (updateError.code === "same_password") return { error: "Choose a new password that is different from your current one." };
    return { error: GENERIC_FAILURE };
  }
  const { error: finishError } = await proof.client.rpc("finish_password_change");
  if (finishError) {
    // The password did change. Fall back to the provider's own "sign out everywhere".
    await proof.client.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
  await endThrowaway(proof.client);
  await real.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/auth/login?message=Your%20password%20was%20changed.%20Sign%20in%20with%20your%20new%20password.");
}

// Part C: delete my account (R2–R4). The database re-checks the fresh proof, typed confirmation and household rules
// inside delete_my_account(); this action only collects them. Permanent.
export async function deleteAccount(_previous: FormState, formData: FormData): Promise<FormState> {
  const real = await signedIn();
  if (field(formData, "confirm", 16) !== "DELETE") return { error: "Type DELETE in capital letters to confirm." };
  const proof = await reauthenticate(real, field(formData, "password"), field(formData, "code", 6) || null);
  if (!proof.ok) return { error: GENERIC_FAILURE };

  const { data, error } = await proof.client.rpc("delete_my_account", { p_confirm: "DELETE" });
  await endThrowaway(proof.client);
  if (error || data !== "deleted") {
    if (/remove the other people/i.test(error?.message ?? "")) {
      return { error: "You own a household that other people belong to. Remove them on the Household page first." };
    }
    return { error: "Your account wasn't deleted. Please try again." };
  }
  await real.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/account/deleted");
}

// ---------------------------------------------------------------------------------------------------------------
// Part B: two-factor sign-in (TOTP). FFH counts an authenticator only after approve_my_mfa_factor(), which the
// database allows only with a fresh password sign-in on a session verified with that authenticator.
// ---------------------------------------------------------------------------------------------------------------
export type EnrollState = { factorId: string | null; qr: string | null; secret: string | null; error: string | null };

// Step 1: create a new, unverified authenticator for the signed-in person and show its QR code and setup key ONCE.
// Nothing is logged or stored by the app; leftover unverified authenticators are removed first.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature required by useActionState
export async function startTwoFactorEnrollment(_previous: EnrollState, _formData: FormData): Promise<EnrollState> {
  const real = await signedIn();
  const status = await readSecurityStatus(real);
  if (!status?.sessionOk) return { factorId: null, qr: null, secret: null, error: GENERIC_FAILURE };
  const { data: factors } = await real.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await real.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
  }
  const { data, error } = await real.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)} ${crypto.randomUUID().slice(0, 4)}` });
  if (error || !data || data.type !== "totp") return { factorId: null, qr: null, secret: null, error: "Two-factor sign-in couldn't be started. Please try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, error: null };
}

// Step 2. First authenticator: password + one code; the throw-away session verifies the new authenticator and
// approves it. Another authenticator (2FA already on): the new one is verified on this browser session first
// (verifying ends other sessions), then password + a code from an existing approved authenticator prove it is you.
// Either way every session ends and the person signs in again with a code.
export async function confirmTwoFactorEnrollment(_previous: FormState, formData: FormData): Promise<FormState> {
  const real = await signedIn();
  const factorId = field(formData, "factor_id", 64);
  const newCode = field(formData, "new_code", 6);
  const password = field(formData, "password");
  if (!isUuid(factorId) || !isTotpCode(newCode)) return { error: "Enter the 6-digit code from your authenticator app." };
  const status = await readSecurityStatus(real);
  if (!status?.sessionOk) return { error: GENERIC_FAILURE };

  if (status.twoFactorOn) {
    const existingCode = field(formData, "existing_code", 6);
    if (!isTotpCode(existingCode)) return { error: "Enter a code from the authenticator you already use." };
    const { error: verifyError } = await real.auth.mfa.challengeAndVerify({ factorId, code: newCode });
    if (verifyError) return { error: GENERIC_FAILURE };
    const proof = await reauthenticate(real, password, existingCode);
    if (!proof.ok) return { error: GENERIC_FAILURE };
    const { error } = await proof.client.rpc("approve_my_mfa_factor", { p_factor_id: factorId });
    await endThrowaway(proof.client);
    if (error) return { error: GENERIC_FAILURE };
  } else {
    const proof = await reauthenticate(real, password, null);
    if (!proof.ok) return { error: GENERIC_FAILURE };
    const { error: verifyError } = await proof.client.auth.mfa.challengeAndVerify({ factorId, code: newCode });
    if (verifyError) {
      await endThrowaway(proof.client);
      return { error: GENERIC_FAILURE };
    }
    const { error } = await proof.client.rpc("approve_my_mfa_factor", { p_factor_id: factorId });
    await endThrowaway(proof.client);
    if (error) return { error: GENERIC_FAILURE };
  }
  await real.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/auth/login?message=Two-factor%20sign-in%20is%20on.%20Sign%20in%20again%20with%20your%20password%20and%20a%20code.");
}

// Turn two-factor sign-in off: password + current code. Approvals removed in the database first (other sessions
// end), then every authenticator on the account is removed with the provider; the one just used goes last.
export async function turnOffTwoFactor(_previous: FormState, formData: FormData): Promise<FormState> {
  const real = await signedIn();
  const proof = await reauthenticate(real, field(formData, "password"), field(formData, "code", 6) || null);
  if (!proof.ok || !proof.twoFactorOn) {
    if (proof.ok) await endThrowaway(proof.client);
    return { error: GENERIC_FAILURE };
  }
  const { error } = await proof.client.rpc("turn_off_my_two_factor");
  if (error) {
    await endThrowaway(proof.client);
    return { error: GENERIC_FAILURE };
  }
  const { data: factors } = await proof.client.auth.mfa.listFactors();
  const all = (factors?.all ?? []).map((f) => f.id);
  const ordered = [...all.filter((id) => id !== proof.verifiedFactorId), ...all.filter((id) => id === proof.verifiedFactorId)];
  for (const id of ordered) await proof.client.auth.mfa.unenroll({ factorId: id }).catch(() => undefined);
  await endThrowaway(proof.client);
  await real.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/auth/login?message=Two-factor%20sign-in%20is%20off.%20Sign%20in%20again%20with%20your%20password.");
}

// Sign-in step 2 (/auth/two-factor): the code upgrades THIS browser session with an approved authenticator.
export async function verifySignInCode(_previous: FormState, formData: FormData): Promise<FormState> {
  const real = await signedIn();
  const status = await readSecurityStatus(real);
  if (!status) redirect("/auth/login");
  if (status.sessionOk) redirect("/plan");
  const code = field(formData, "code", 6);
  if (!isTotpCode(code)) return { error: "Enter the 6-digit code from your authenticator app." };
  const verified = await verifyAnyApprovedFactor(real, status.approvedFactorIds, code);
  if (!verified) return { error: "That code didn't work. Wait for a new code and try again." };
  redirect("/plan");
}
