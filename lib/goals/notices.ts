// FFH-P07: fixed messages for the Goals page; only these keys are accepted from the URL.
export const GOALS_NOTICES = {
  goal_saved: { ok: true, text: "Goal saved." },
  goal_deleted: { ok: true, text: "Goal deleted." },
  check_in_saved: { ok: true, text: "Check-in saved." },
  check_in_deleted: { ok: true, text: "Check-in deleted." },
  check_in_exists: { ok: false, text: "There's already a check-in for that month. Open it from the list to change it." },
  future_month: { ok: false, text: "Check-ins can't be for a future month." },
  read_only: { ok: false, text: "Viewers can look but can't change goals or check-ins. Ask the household owner to make you a member." },
  invalid: { ok: false, text: "Something about that entry wasn't valid, so nothing changed. Please check the amounts and try again." },
  failed: { ok: false, text: "We couldn't save that. Please try again." },
} as const;

export type GoalsNoticeKey = keyof typeof GOALS_NOTICES;

export function goalsNotice(raw: unknown) {
  return typeof raw === "string" && Object.hasOwn(GOALS_NOTICES, raw) ? GOALS_NOTICES[raw as GoalsNoticeKey] : null;
}
