export type TargetCheck = { ok: true; origin: string; local?: true } | { ok: false; reason: string };
export type Account = { label: "TestA" | "TestB"; email: string; password: string };
export type Credentials = { ok: true; a: Account; b: Account } | { ok: false; missing: string[] };
export const ALLOWED_HOSTS: Set<string>;
export const REFUSED_HOSTS: Set<string>;
export const PAGES: string[];
export function localhostAllowed(env: Record<string, string | undefined>): boolean;
export function checkTarget(raw: string, env?: Record<string, string | undefined>): TargetCheck;
export function credentialsFrom(env: Record<string, string | undefined>): Credentials;
export function leakedMarkers(text: string, otherMarkers: string[]): string[];
export function identityMatches(displayedEmail: string, expectedEmail: string): boolean;
export function buildMatches(info: { commit?: unknown; environment?: unknown } | null, expectedSha: string): boolean;
export function leavesOrigin(requestUrl: string, origin: string): boolean;
export class OriginViolation extends Error {}
