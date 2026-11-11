# Repository map

- `app/`, `components/`: application UI and routes.
- `lib/`: financial calculations and application logic.
- `supabase/migrations/`: database schema, RLS policies and grants.
- `tests/security/`: security regression tests; `lib/calculations/*.test.ts`: calculation tests.
- `scripts/rls-local/preflight.sql`, `matrix.sql`: two-household RLS catalog check and 913-assertion matrix.
- `scripts/rls-local/parity.sql` and `parity.expected.txt`: read-only schema fingerprint, for hosted parity.
- `scripts/rls-ci/run-matrix.sh`: runs all three on a disposable database in CI.
- `scripts/smoke/deployed-auth-smoke.mjs`: unauthenticated auth checks against a deployed URL.
- `.github/workflows/ci.yml`: CI (`fast`, `rls-matrix`, `full-phase`); `scripts/validate-release-candidate.mjs`:
  repo shape validator.
- `docs/WORKFLOW.md`, `docs/workflow/`: how work flows, the phase template and the independent review prompt; `.ai/`: five short project-control files.
- `.history/`: archived evidence; not active authority.
