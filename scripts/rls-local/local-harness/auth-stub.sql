-- Local-only stub of the Supabase auth schema, shaped like the real one (columns and NOT NULLs from the FFH-P08
-- spike, docs/workflow/FFH-P08_SPIKE_RESULTS.md). Used ONLY by scripts/rls-local/local-harness/run.sh; never in CI.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create type auth.aal_level as enum ('aal1','aal2','aal3');
create table auth.users (id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text, created_at timestamptz default now(), updated_at timestamptz);
create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz, updated_at timestamptz, factor_id uuid, aal auth.aal_level, not_after timestamptz, refreshed_at timestamp);
create table auth.mfa_factors (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, friendly_name text, factor_type text, status text, created_at timestamptz not null, updated_at timestamptz not null, secret text);
create table auth.refresh_tokens (id bigserial primary key, token text, user_id text, session_id uuid references auth.sessions(id) on delete cascade, revoked boolean);
create table auth.identities (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
grant execute on all functions in schema auth to anon, authenticated, service_role;
-- Supabase's default public-schema privileges.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role supabase_admin in schema public grant execute on functions to anon, authenticated;
