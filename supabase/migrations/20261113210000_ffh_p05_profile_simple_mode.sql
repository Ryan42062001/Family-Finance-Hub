-- FFH-P05: per-user Simple mode (Ryan, 2026-11-13).
-- The setting lives on the caller's own profile row. public.profiles is already
-- self-scoped by RLS (profiles_select_self / profiles_insert_self /
-- profiles_update_self: id = auth.uid()), so nobody can read or change another
-- user's setting, including other members of the same household. No new policy,
-- grant, function or trigger is added. Off by default for every existing and new user.
alter table public.profiles
  add column simple_mode boolean not null default false;

comment on column public.profiles.simple_mode is
  'Per-user view preference: true shows the simplified app. Presentation only; never changes household data or calculations.';
