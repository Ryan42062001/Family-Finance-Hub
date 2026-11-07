# Family Finance Hub — Product Roadmap

## Completed product foundation

Phases 1–6 established secure household foundation, profile, dashboard, planning tools, Money Priority Engine, and Scenario Lab product baseline. Historical task/PR acceptance does not automatically integrate unresolved branch work.

## Governance transition

Status: CLOSED.

Speed Workflow V2.1 replaced the active Workflow V3/V3.1 control plane through PR #79. The audited migration merged to canonical `main` at `f1b2b25c1672019ffcd4cef7ddac6306067d4183`, and post-merge FAST run `36656833982` passed. Historical records remain archived under `.history/workflow-v3-1/` as evidence only.

## FFH-P01 — Release Blocker Integration & Production Readiness

State: PUNCH_LIST. Risk: HIGH.
Activation baseline: `241b9d665c68b97e9947996ecc678752d9654d8c`.
Phase branch: `phase/ffh-p01-release-readiness`.

Manager reconciliation established before activation:
- FFH-050 root-entry remediation is already canonical through merged PR #69.
- The accepted FFH-051 repaired product/test blobs from `4598770486fd3300cc1048103342fda4bb509aef` are already canonical through merged PR #76.
- The accepted FFH-052 product/test blobs from `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a` are already canonical through merged PR #76.
- Therefore FFH-P01 must not re-cherry-pick or re-merge PRs #70/#71. PRs #68/#70/#71/#72/#73/#74/#75/#77 remain historical evidence lanes pending separate Manager disposition.

Phase goals:
- Reverify email confirmation, auth redirects, cookies, sessions, first authenticated request, and trusted production Host/origin behavior against current code.
- Prove deployed two-household negative RLS isolation and that Scenario Lab makes no unauthorized persistence or profile mutation, using synthetic identities/data only.
- Keep private source/oracle/custody material private; unresolved fixture, oracle, dependency-host, and browser-runtime/F13 gates remain unresolved until independently proved or explicitly preserved as release-blocking.
- Refresh stale release-facing documentation only from verified current evidence.
- Maintain rollback evidence before production acceptance.
- Production deployment, Supabase/auth mutation, Private Beta, and paid custom domain/configuration remain separate Ryan decisions.

Active punch list:
- Preview origin configuration blocks owner preview. Repair only the Vercel Preview-scoped `NEXT_PUBLIC_SITE_URL`, preserve the fail-closed security boundary, and do not change Production or Supabase hosted-auth configuration without separate authorization.

## Downstream

Private Beta follows separately authorized production readiness and is not authorized. Historical FFH-038/047-style nonblocking cleanup may be reconsidered as future backlog, without reviving old task lanes.
