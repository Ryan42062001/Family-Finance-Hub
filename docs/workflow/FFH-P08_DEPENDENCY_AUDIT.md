# FFH-P08 dependency audit triage (2026-11-18)

Trigger: `fast` failed at `npm audit --audit-level=high` on the P08 phase branch (run 44217091021; `rls-matrix`
passed). Inherited findings: **9 HIGH, 6 MODERATE**, none caused by application changes.

## Findings

| Advisory | Severity | Package | Patched release | Where it sits |
|---|---|---|---|---|
| GHSA-g3hv-75wg-m249 (minimatch globparts DoS) | MODERATE | `minimatch` 10.2.6 via `typescript-eslint` 8.72.2 | Yes (≥ 11.0.1) | dev-only lint toolchain |
| GHSA-fc5q-39xc-vjpf (picomatch ReDoS, single-branch repeated extglobs) | HIGH (CVSS 4.0: 8.7, availability only) | `picomatch` 2.3.2 / 4.0.7 | **None** ("<= 4.0.7"; 4.0.7 is the latest release) | dev-only lint toolchain |

All 9 HIGH entries are the single picomatch advisory, reported once per package that depends on it:
`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `picomatch`, and
`eslint-config-next` → `eslint-import-resolver-typescript` / `typescript-eslint` → `tinyglobby` → `fdir`/`picomatch`.

## Remediation in this PR (non-breaking)

`npm audit fix` without `--force`, lockfile only (`package.json` unchanged): `typescript-eslint` 8.72.2 → 8.73.0
(and its `@typescript-eslint/*` packages), `minimatch` 10.2.6 → 11.0.9 in that subtree, plus their in-range
transitive updates. Result: **MODERATE 6 → 0**. Lint output is identical before and after (0 errors, the same 3
existing warnings).

`npm audit fix --force` was **not** applied: it proposes downgrading `eslint-config-next` 16.4.6 → 14.2.35, a breaking
change for this Next 16 project that would still not remove picomatch (no patched picomatch exists).

After this PR `npm audit` reports **14 HIGH, 0 MODERATE**: the same single picomatch advisory, now also attributed to
the `typescript-eslint` 8.73.0 packages (they depend on `tinyglobby`). The HIGH count rises because of how npm attributes
one advisory to every dependent; no new advisory was introduced. With the bare `npm audit` gate, `fast` still failed; see the decision below.

## Exposure assessment for the HIGH advisory

- The advisory requires the **attacker to supply the glob pattern**. Every affected copy runs only inside ESLint on a
  developer machine or CI runner, against this repository, with patterns written by us (ESLint config,
  `tsconfig.json` paths, plugin defaults).
- `npm audit --omit=dev` reports **0 vulnerabilities**: nothing affected ships in production dependencies.
- Next.js vendors its own picomatch (`next/dist/compiled/picomatch`), which `npm audit` cannot see. It is used for
  `images.remotePatterns` / `images.localPatterns` and build-time matching; `next.config.ts` configures no image
  patterns, so no runtime path takes a pattern from a request.
- Conclusion: not exploitable in Production or Preview; residual risk is a slow lint run on a crafted config, which
  only a committer could introduce.

## Decision: option 2 approved by Ryan (2026-11-18)

Implemented in `scripts/audit-gate.mjs` (CI `fast` and `full-phase`, replacing the bare `npm audit --audit-level=high`)
with the single entry in `scripts/audit-exceptions.json`: `GHSA-fc5q-39xc-vjpf`, package `picomatch`, **review date
2027-01-18**. The gate still fails on any other HIGH/CRITICAL advisory, on this advisory if it becomes CRITICAL,
reaches a production dependency (at any severity) or appears on another package, after the review date, and on any
unreadable npm output. Tests: `tests/security/ffh-p08-audit-gate.test.ts`. When picomatch ships a fix, update the
lockfile and delete the exception; the gate prints a note when an exception no longer matches anything.

## Options that were considered

1. **Wait for an upstream picomatch release** (recommended to track regardless). Every phase-branch `fast` run stays
   red until then, which blocks phase-branch merges, including docs PR #162.
2. **Narrow, expiring exception (Builder recommendation):** keep `npm audit --audit-level=high` for everything, but
   allow exactly `GHSA-fc5q-39xc-vjpf` **only while** (a) every affected path is dev-only and `npm audit --omit=dev`
   is clean, and (b) a fixed review date has not passed. Any other HIGH/CRITICAL, or this advisory reaching a
   production dependency, still fails. Implemented as a small checked-in script with its own security tests, in a
   reviewed PR. Changes the gate, so needs Ryan's explicit approval.
3. Replace `eslint-config-next` with a hand-built ESLint config. Not viable on its own: `@next/eslint-plugin-next`
   itself depends on `fast-glob` → `picomatch`.
