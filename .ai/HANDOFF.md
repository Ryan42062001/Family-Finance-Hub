# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-19 — FFH-P10 released and closed.

- **Production:** FFH-P10 Can We Afford It? + financial best-practice warnings, merged as
  `cc7c70724df7bc3b8e5729cbec1fcd96cf6ef57e` from phase head `eca9d43bb20a642d16b31013005510b609900014` (PR #189,
  Ryan's explicit authorization 2026-11-19). Production `/api/build-info` = `cc7c707`; Production smoke **12/12** (run by
  the Builder); signed-out `/what-if`, `/what-if/purchase?type=home|vehicle` redirect to sign-in. P10 **CLOSED**.
  (P09's close-out, draft #187, shipped inside this release.)
- **P10 shipped:** `/what-if` (replaces the Scenario Lab tab; Scenario Lab under Tools, detailed view only) and the
  guided `/what-if/purchase?type=home|vehicle` check, one option or two side by side, read-only. Verdicts come only from
  the canonical evaluators via the Scenario Lab adapters; separate nonblocking rules of thumb (28/36, 20/3/8, vehicle
  value ≤ ½ income, 3–6 months reserves). The form pre-answers nothing; blank costs stay unknown. Spec: issue #171.
  Code: `lib/purchase-check/`, `app/what-if/`.
- **Hosted Supabase:** no change in P10 (still 26 migrations, parity 9/9 from P09). No new environment variables.
- **Evidence:** audit receipt `docs/workflow/FFH-P10_AUDIT.md` (FAIL at `865783a` → fixed → PASS at `eca9d43`); QA and
  release evidence on PR #189; decisions in `.ai/DECISIONS.md`.
- **Backlog:** pre-existing LOW: the canonical evaluators emit plan-impact risks when no post-purchase engine ran
  (`.ai/DECISIONS.md`, P10 entry); P08 F04 LOW, N01, picomatch audit exception review by 2027-01-18.
- **Lessons learned (P10):** one improvement proposed for Ryan's approval (guided-input contract check before freezing);
  see `.ai/DECISIONS.md` "FFH-P10 released" entry. Not adopted until Ryan approves.
- **Next phase:** FFH-P11 (issue #172) is not started and needs Ryan's separate approval. Start it in a fresh chat on
  the cloud environment **Family-Finance-Hub**; rules in `AGENTS.md`. The Preview domain still points at
  `phase/ffh-p10-can-we-afford-it`; move it when the next phase branch starts.
- **Repository bookkeeping:** this close-out is carried forward to the next authorized release (draft PR into `main`,
  not merged alone, which would deploy Production).
