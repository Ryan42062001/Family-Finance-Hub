# Architecture and protected boundaries

Next.js and TypeScript application, Supabase authentication with household-scoped RLS, pure financial calculation
modules, and Scenario Lab. No engineer may invent financial policy. Money routing and reconciliation must be exact and
fail closed; unknown material financial or legal-capacity facts stay unknown. Authentication and household isolation
fail closed; cross-household access is prohibited. The server derives the household from the authenticated membership,
never from client input. Secrets and real household financial data never enter the repository or shared evidence.
Supabase schema and RLS changes are migrations in a reviewed PR, verified by the CI `rls-matrix` job. Applying anything
to hosted Supabase, and production deployment, are separate Ryan decisions.
