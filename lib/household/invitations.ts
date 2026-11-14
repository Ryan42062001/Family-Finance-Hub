import { createHash, randomBytes } from "node:crypto";

// FFH-P06: invitation link tokens. 32 random bytes as base64url (43 characters). Only the
// SHA-256 hex hash is stored in the database; the token exists only in the link.
export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const INVITE_COOKIE = "ffh_invite";
export const INVITE_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const INVITE_ROLES = ["member", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && INVITE_TOKEN_PATTERN.test(value);
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

// Builds the link only from the configured site origin (never from request headers).
export function inviteLink(siteUrl: string | undefined, token: string): string | null {
  if (!siteUrl || !isInviteToken(token)) return null;
  let origin: URL;
  try { origin = new URL(siteUrl); } catch { return null; }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") return null;
  return `${origin.origin}/invite/${token}`;
}

export function parseInviteRole(value: unknown): InviteRole | null {
  return typeof value === "string" && (INVITE_ROLES as readonly string[]).includes(value) ? (value as InviteRole) : null;
}

export function parseInviteLabel(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const label = value.trim();
  if (!label) return null;
  return label.length <= 60 ? label : undefined;
}
