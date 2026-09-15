# FFH-017 — Core Engine Worklog

Task: Phase 5C Recurring Goal-versus-Retirement Competition
Branch: `ffh/ffh-017-goal-retirement-competition`
PR: #26
Approved base: `phase-5-money-priority-engine` at `ecb05a6795c047365817164409739a2d0bdc7f76`

## Rescue findings

The refreshed PR head was `d70cef6849e6940cb44b79f702765d178cead694`. Contrary to the prior packet, Foundation CI run `34989685355`, job `104450794218` did not run the standard calculation/typecheck/lint/build chain to completion. A temporary diagnostic workflow skipped those standard gates and exposed 15 exact calculation failures in committed-expense, Existing Cash, goal-ranking, Recommendation Refresh, and retirement-integration tests.

The reported `money-priority-build.ts:344` BELOW-union Build error was not present at the authoritative PR head: local `npm run typecheck` and a clean-cache `npm run build` both passed. FFH-D004 nevertheless remains explicit in production: BELOW is retained as a first-class disposition and is allocated only after additional retirement.

## Root cause and remediation

The 15 failures were stale or incomplete pre-Phase-5C test contracts, not a defect in the authoritative FFH-D004 allocator:

- legacy goal fixtures confirmed Goal Intelligence but left material retirement facts unresolved, correctly producing targeted `MORE_INFORMATION_NEEDED`;
- older allocation assertions expected pre-Phase-5C protected-goal multipliers instead of OUTRANKS / CO_PRIORITY / BELOW behavior;
- the retirement integration assertion compared the total retirement request to only the above-floor tranche and omitted the separately protected floor;
- Recommendation Refresh's test-only legacy adapter derived normalized economic facts from the mutable display name, causing a false fingerprint change;
- Your Plan's funding-gap assertion omitted untouched allocations;
- Existing Cash tests left retirement authority incomplete or unintentionally left above-floor retirement room, contaminating scenarios intended to isolate goal funding.

The correction is test-only: provide explicit retirement facts where the scenario requires actionable recurring competition, align assertions with FFH-D004 tranche semantics, make the legacy adapter derive stable placeholder facts from goal ID rather than display name, and preserve separate protected-floor plus additional-retirement accounting.

Temporary CI diagnostic changes and the unrelated FFH-013 lifecycle edit were removed from PR scope. No production, schema, UI, HSA, SIMPLE, IRA, Secure, Windfall, or Supabase behavior was changed by the rescue.

## Local validation

- `npm test` — PASS, 866/866.
- `npm run test:security` — PASS, 21/21.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS with one pre-existing React hook warning and zero errors.
- `npm run build` after isolating the stale local `.next` cache — PASS.
- `npm run ai:validate-state` — PASS with legacy-task warnings only.

Candidate `31ed0be86fca58938c6a699ae2fccbc76374552d` triggered Foundation CI run `34992242373`, job attempts `104459541271` and `104459794425`. Both failed before checkout with no steps or downloadable job log. The same exact-head run was retried once and reproduced the runner-start failure. This was CI infrastructure evidence rather than a calculation/build failure.

## Self-hosted validation recovery

The repository owner configured repository-scoped runner `FFH-Windows-Runner` with labels `self-hosted`, `Windows`, `X64`, and `ffh-local`. Foundation CI now uses that runner at `$0` GitHub-hosted-runner cost. Run steps use `cmd.exe`, preserving the user's existing Windows PowerShell execution-policy settings.

Pre-handoff head `545d3b12710086b0fefb44be9b7823309f30da0e` passed full Foundation CI run `34999388253`, job `104483637634`.

Final handoff commit `c7882907854579488eb82f4d9f18799b51522550` then passed full Foundation CI run `35000961119`, job `104488944773`, including AI-state, dependency audit, calculations, security, typecheck, lint, and build.

The task and task index were subsequently synchronized to `READY_FOR_MANAGER`. This worklog-only commit exists solely to force one exact final-head Foundation CI check after those lifecycle commits; it changes no financial-engine behavior, tests, policy, or allocation logic.
