// FFH-P05 review fix: fixed messages the plan page can show after guided setup. The
// address bar carries only one of these keys; anything else shows nothing, so no text
// from the URL is ever displayed.
export const PLAN_NOTICES = {
  savings_pending: {
    tone: "info",
    title: "Your savings aren't in this plan yet",
    body: "You chose \"Not sure\" for what your savings are for, so they weren't added. When you know, add them under Financial profile → Accounts and pick what they're for.",
    link: { href: "/financial-profile#accounts", label: "Add your savings" },
  },
  joined: {
    tone: "info",
    title: "You've joined the household",
    body: "This is the household's shared money plan. Your role decides whether you can edit its details.",
    link: { href: "/household", label: "See who's in your household" },
  },
  already_set_up: {
    tone: "info",
    title: "Setup didn't add anything",
    body: "Your household already has details, so the quick setup was skipped. You can change any of them under Financial profile.",
    link: { href: "/financial-profile", label: "Go to Financial profile" },
  },
} as const;

export type PlanNoticeKey = keyof typeof PLAN_NOTICES;

export function planNotice(raw: unknown) {
  return typeof raw === "string" && Object.hasOwn(PLAN_NOTICES, raw) ? PLAN_NOTICES[raw as PlanNoticeKey] : null;
}
