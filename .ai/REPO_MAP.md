# Repository map

- `app/`, `components/`: application UI and routes.
- `lib/`: financial calculations and application logic.
- `supabase/migrations/`: database schema, RLS policies and grants.
- `tests/security/`: security regression tests; `lib/calculations/*.test.ts`: calculation tests.
- `scripts/rls-local/preflight.sql`, `matrix.sql`: two-household RLS catalog check and 913-assertion matrix.
- `scripts/rls-ci/run-matrix.sh`: runs them on a disposable database in CI.
- `.github/workflows/ci.yml`: CI (`fast`, `rls-matrix`, `full-phase`); `scripts/validate-release-candidate.mjs`:
  repo shape validator.
- `docs/WORKFLOW.md`, `docs/workflow/PHASE_TEMPLATE.md`: how work flows; `.ai/`: five short project-control files.
- `.history/`: archived evidence; not active authority.
