# Architecture and protected boundaries

Next.js and TypeScript application, Supabase authentication and household-scoped RLS, pure financial calculation modules, and Scenario Lab. No engineer may invent financial policy. Money routing and reconciliation must be exact and fail closed; unknown material financial or legal-capacity facts stay unknown. Authentication and household isolation fail closed; cross-household access is prohibited. Secrets and real household financial data never enter repository or shared evidence. Supabase schema, RLS, and live-data changes require explicit bounded authorization. Production deployment is separate from product-phase merge.

Product/runtime surfaces remain untouched by the workflow migration: `app/`, `components/`, `lib/`, `supabase/`, `tests/`, `proxy.ts`, `next.config.ts`, and package/TypeScript configuration.
