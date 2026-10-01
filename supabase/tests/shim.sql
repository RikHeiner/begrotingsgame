-- Bootst na wat Supabase standaard heeft, zodat de migraties op een gewone Postgres te testen zijn.
-- Alleen voor tests; draai dit nooit op het echte Supabase-project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;

create schema extensions;
create schema auth;
grant usage on schema auth, extensions to anon, authenticated;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant execute on function auth.jwt() to anon, authenticated;

-- Supabase geeft anon en authenticated standaard alle rechten op nieuwe objecten in public.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
