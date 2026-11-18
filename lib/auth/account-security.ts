import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// FFH-P08 account security helpers (docs/FFH-P08_PROPOSAL.md §10.2, §11). Server only: no "use client" module may
// import this file (tests/security/ffh-p08-account-security.test.ts).
//
// Sensitive actions prove a FRESH password sign-in (and a fresh code when two-factor sign-in is on) by signing in
// on a throw-away client: in-memory storage, no cookies, no refresh, never serialised. Its access token carries
// the fresh `amr` timestamps that the database checks itself (private.recent_reauth). The real browser session is
// only used to learn who is signed in; the throw-away session must belong to the same user id, and it is always
// ended with a LOCAL sign-out (the default scope is global and would sign the person out everywhere).

export const PASSWORD_MIN = 8; // R6 as amended by Ryan, 2026-11-18
export const PASSWORD_MAX_BYTES = 72; // bcrypt limit used by Supabase Auth
export const GENERIC_FAILURE = "That didn't work. Check what you typed and try again.";

export type SecurityStatus = {
  sessionOk: boolean;
  twoFactorOn: boolean;
  unapprovedFactor: boolean;
  approvedFactorIds: string[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Parses my_security_status(); anything unexpected is treated as "not usable" (fail closed).
export function parseSecurityStatus(raw: unknown): SecurityStatus | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.session_ok !== "boolean" || typeof r.two_factor_on !== "boolean" || typeof r.unapproved_factor !== "boolean") return null;
  if (!Array.isArray(r.approved_factor_ids) || !r.approved_factor_ids.every((id) => typeof id === "string" && UUID.test(id))) return null;
  return {
    sessionOk: r.session_ok,
    twoFactorOn: r.two_factor_on,
    unapprovedFactor: r.unapproved_factor,
    approvedFactorIds: r.approved_factor_ids as string[],
  };
}

export async function readSecurityStatus(supabase: SupabaseClient): Promise<SecurityStatus | null> {
  const { data, error } = await supabase.rpc("my_security_status");
  if (error) return null;
  return parseSecurityStatus(data);
}

// Returns a user-facing problem with a proposed new password, or null when it is acceptable.
export function newPasswordProblem(next: string, confirm: string, current: string): string | null {
  if (next.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters for your new password.`;
  if (new TextEncoder().encode(next).length > PASSWORD_MAX_BYTES) return "That password is too long. Use 72 characters or fewer.";
  if (next !== confirm) return "The two new passwords don't match.";
  if (next === current) return "Choose a new password that is different from your current one.";
  return null;
}

export function isTotpCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

export function field(formData: FormData, name: string, max = 512): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
}

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

export function createThrowawayClient(): SupabaseClient {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: memoryStorage() },
  });
}

export async function endThrowaway(client: SupabaseClient): Promise<void> {
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // The session may already have been ended by the database; nothing else to clean up.
  }
}

export type Reauth =
  | { ok: true; client: SupabaseClient; userId: string; twoFactorOn: boolean; verifiedFactorId: string | null }
  | { ok: false };

// `code` is required exactly when the person has two-factor sign-in on.
export async function reauthenticate(real: SupabaseClient, password: string, code: string | null): Promise<Reauth> {
  const { data: who, error: whoError } = await real.auth.getUser();
  const userId = who?.user?.id;
  const email = who?.user?.email;
  if (whoError || !userId || !email || !password) return { ok: false };

  const client = createThrowawayClient();
  const { data: signedIn, error } = await client.auth.signInWithPassword({ email, password });
  if (error || signedIn?.user?.id !== userId) {
    await endThrowaway(client);
    return { ok: false };
  }
  const status = await readSecurityStatus(client);
  if (!status) {
    await endThrowaway(client);
    return { ok: false };
  }
  let verifiedFactorId: string | null = null;
  if (status.twoFactorOn) {
    verifiedFactorId = isTotpCode(code) ? await verifyAnyApprovedFactor(client, status.approvedFactorIds, code) : null;
    if (!verifiedFactorId) {
      await endThrowaway(client);
      return { ok: false };
    }
  }
  return { ok: true, client, userId, twoFactorOn: status.twoFactorOn, verifiedFactorId };
}

// Returns the id of the approved factor the code verified, or null.
export async function verifyAnyApprovedFactor(client: SupabaseClient, factorIds: string[], code: string): Promise<string | null> {
  for (const factorId of factorIds) {
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    if (!error) return factorId;
  }
  return null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
