// FFH-P11 set-aside form parsing (guided-financial-input contract, Ryan 2026-11-19, .ai/DECISIONS.md):
//   1. nothing is pre-answered: the amount field starts blank and the confirmation box starts unticked;
//   2. a blank amount NEVER becomes $0: it is refused with "missing", so the person has to type it;
//   3. missing or malformed input is a field-linked validation error, never a guess;
//   4. an explicitly typed 0 (or $0.00) is accepted: "nothing set aside yet" is a legitimate answer.
// Pure: returns a result instead of throwing, so the page can show the error next to the field.
import { isAllowedDueDate, isRecurrence, parseCents, type IsoDate, type Recurrence } from "./schedule.ts";

export type SetAsideFieldError = "amount_missing" | "amount_invalid" | "confirm_missing";
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: SetAsideFieldError };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// The reported amount as exact cents. Blank is "missing", not zero.
export function reportedAmount(formData: FormData, key: string): Parsed<number> {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return { ok: false, error: "amount_missing" };
  const cents = parseCents(raw);
  return cents === null ? { ok: false, error: "amount_invalid" } : { ok: true, value: cents };
}

// An explicit tick of the confirmation box (value "yes"); absent or anything else is "missing".
export function confirmed(formData: FormData, key = "confirm"): Parsed<true> {
  return formData.get(key) === "yes" ? { ok: true, value: true } : { ok: false, error: "confirm_missing" };
}

// Exact two-decimal string for the numeric column (no floating point).
export function centsToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError("Invalid amount in cents");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

// Structural fields the page itself rendered (ids, the shown cycle date, the schedule it came from). Anything
// malformed here is not a user mistake but a forged or broken request: these throw (fail closed).
export function formUuid(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "");
  if (!UUID.test(value)) throw new Error(`Invalid ${key}`);
  return value;
}

export function formDate(formData: FormData, key: string): IsoDate {
  const value = String(formData.get(key) ?? "");
  if (!isAllowedDueDate(value)) throw new Error(`Invalid ${key}`);
  return value;
}

export function formRecurrence(formData: FormData, key: string): Recurrence {
  const value = String(formData.get(key) ?? "");
  if (!isRecurrence(value)) throw new Error(`Invalid ${key}`);
  return value;
}

export function formVersion(formData: FormData, key = "version"): number {
  const value = String(formData.get(key) ?? "");
  if (!/^[1-9]\d{0,8}$/.test(value)) throw new Error(`Invalid ${key}`);
  return Number(value);
}
