# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-14 by Claude Code.

- **Phase:** FFH-P06 household invitations (HIGH risk). Phase branch `phase/ffh-p06-household-invitations` at
  `02ebd6e`; phase PR #143 (draft into `main`). Production is FFH-P05 at `1bd1b59`.
- **Status:** the independent review FAILED at `02ebd6e` (HIGH: two invites accepted at once → two households;
  MEDIUM: owner-set invitation timestamps; LOW: Q24 wording). The remediation (ChatGPT commits `dc61f05`, `9f8841b`)
  is on `claude/great-shannon-wflzwr`. Ryan lifted the no-deploy hold on 2026-11-14.
- **In progress:** take the new 19-migration schema fingerprint from CI, commit it, then confirm the 970-check RLS
  matrix and the two-session concurrency test pass.
- **Next:** PR into the phase branch, merge when green, focused ChatGPT re-review of the remediation, then Ryan
  applies migration `20261114020000` to hosted Supabase (with the CRLF clean-up), then parity, Work mode Q23–Q26,
  and the release decision.
- **Waiting on Ryan:** nothing yet; the hosted SQL step comes after the re-review.
