// FFH-P06: fixed messages for the Household page; only these keys are accepted from the URL.
export const HOUSEHOLD_NOTICES = {
  cancelled: { ok: true, text: "Invitation cancelled. That link no longer works." },
  role_changed: { ok: true, text: "Role updated." },
  removed: { ok: true, text: "Removed from your household. They can no longer see its money." },
  not_allowed: { ok: false, text: "That change isn't allowed. Only the household owner can manage people, and the owner can't be changed or removed." },
  invalid: { ok: false, text: "Something about that request wasn't valid, so nothing changed." },
} as const;

export function householdNotice(raw: unknown) {
  return typeof raw === "string" && Object.hasOwn(HOUSEHOLD_NOTICES, raw) ? HOUSEHOLD_NOTICES[raw as keyof typeof HOUSEHOLD_NOTICES] : null;
}
