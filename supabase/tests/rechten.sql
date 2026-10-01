-- Tests voor de migratie: rechten, row level security, insturen, filter, rate limiting.
-- Elke test gooit een fout als hij niet klopt; psql stopt dan (ON_ERROR_STOP).
\set QUIET on
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

create function pg_temp.moet_falen(sql text, verwacht text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'Verwacht een fout (%), maar het lukte: %', verwacht, sql;
exception when others then
  if sqlerrm like 'Verwacht een fout%' then raise; end if;
  if position(verwacht in sqlerrm) = 0 and sqlstate <> verwacht then
    raise exception 'Verkeerde fout bij %: % (%)', sql, sqlerrm, sqlstate;
  end if;
end;
$$;
grant execute on function pg_temp.moet_falen(text, text) to anon, authenticated;

create function pg_temp.goed(naam text, ok boolean) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'Test mislukt: %', naam; end if;
  raise notice 'ok: %', naam;
end;
$$;
grant execute on function pg_temp.goed(text, boolean) to anon, authenticated;

insert into public.fractie_leden (email) values ('raadslid@example.nl');

-- Een geldige inzending, zoals de game hem stuurt
create temp table voorbeeld as select jsonb_build_object(
  'begrotingsjaar', 2026,
  'keuzes', jsonb_build_object('onderdelen', jsonb_build_object('h1', -10), 'belastingen', jsonb_build_object('t1', -5),
                               'kaarten', jsonb_build_array('k_veiling'), 'scenario', 'midden'),
  'missie', 'lagere_lasten', 'gebied', 'zuid', 'idee', 'Meer bankjes in het park.',
  'toestemming', true, 'toestemming_versie', 1, 'duur_ms', 60000, 'website', ''
) as j;
grant select on voorbeeld to anon, authenticated;

-- ---------- Als speler (anon) ----------
set role anon;
set request.headers = '{"x-forwarded-for": "203.0.113.7, 10.0.0.1"}';

select pg_temp.goed('insturen geeft een id', public.insturen((select j from voorbeeld)) is not null);
select pg_temp.moet_falen('select * from public.inzendingen', '42501');
select pg_temp.moet_falen('select * from public.aanmeldingen', '42501');
select pg_temp.moet_falen('select * from public.fractie_leden', '42501');
select pg_temp.moet_falen($$insert into public.inzendingen (begrotingsjaar, keuzes, toestemming_versie) values (2026, '{}', 1)$$, '42501');
select pg_temp.moet_falen('select * from prive.limieten', '42501');
select pg_temp.moet_falen($$select public.idee_verdacht('x')$$, '42501');
select pg_temp.moet_falen('select public.opschonen()', '42501');
select pg_temp.moet_falen('select public.is_fractie()', '42501');

-- Toestemming en spam
select pg_temp.moet_falen($$select public.insturen((select j - 'toestemming' from voorbeeld))$$, 'toestemming');
select pg_temp.moet_falen($$select public.insturen((select j || '{"website": "http://spam"}' from voorbeeld))$$, 'geweigerd');
select pg_temp.moet_falen($$select public.insturen((select j || '{"duur_ms": 500}' from voorbeeld))$$, 'geweigerd');
-- Ongeldige keuzes
select pg_temp.moet_falen($$select public.insturen((select jsonb_set(j, '{keuzes,onderdelen,h1}', '"veel"') from voorbeeld))$$, 'keuzes');
select pg_temp.moet_falen($$select public.insturen((select jsonb_set(j, '{keuzes,onderdelen,h1}', '5000') from voorbeeld))$$, 'keuzes');
select pg_temp.moet_falen($$select public.insturen((select jsonb_set(j, '{keuzes,kaarten}', '["<script>"]') from voorbeeld))$$, 'keuzes');
select pg_temp.moet_falen($$select public.insturen((select jsonb_set(j, '{keuzes,scenario}', '"alles"') from voorbeeld))$$, 'keuzes');
select pg_temp.moet_falen($$select public.insturen((select j || '{"gebied": "Mijn straat 12"}' from voorbeeld))$$, '23514');
-- E-mail zonder aparte toestemming
select pg_temp.moet_falen($$select public.insturen((select j || '{"email": "a@example.nl"}' from voorbeeld))$$, 'aparte toestemming');
-- Twee geslaagd (eerste + deze), plus mislukte pogingen die ook tellen? Nee: een fout draait de teller terug.
select pg_temp.goed('met e-mail en toestemming',
  public.insturen((select j || '{"email": "A@Example.nl", "email_toestemming": true, "idee": "Bel me: 06-12345678"}' from voorbeeld)) is not null);
select pg_temp.goed('zonder idee', public.insturen((select j - 'idee' from voorbeeld)) is not null);
select pg_temp.goed('scheldwoord', public.insturen((select j || '{"idee": "Wat een KANKERplan"}' from voorbeeld)) is not null);
select pg_temp.goed('postcode', public.insturen((select j || '{"idee": "Kom langs op 9712 AB 4"}' from voorbeeld)) is not null);
-- Rate limiting: vijf per uur per IP-adres
select pg_temp.moet_falen($$select public.insturen((select j from voorbeeld))$$, 'PT429');
-- Een ander IP-adres mag wel
set request.headers = '{"x-forwarded-for": "198.51.100.1"}';
select pg_temp.goed('ander IP-adres', public.insturen((select j from voorbeeld)) is not null);
reset role;

-- ---------- Wat er is opgeslagen ----------
select pg_temp.goed('zes inzendingen', (select count(*) from public.inzendingen) = 6);
select pg_temp.goed('statussen', (select array_agg(idee_status order by aangemaakt, idee_status) from public.inzendingen)
  @> array['nieuw', 'verdacht', 'geen']);
select pg_temp.goed('telefoonnummer is verdacht',
  (select idee_status from public.inzendingen where idee like 'Bel me%') = 'verdacht');
select pg_temp.goed('scheldwoord is verdacht',
  (select idee_status from public.inzendingen where idee like 'Wat een%') = 'verdacht');
select pg_temp.goed('postcode is verdacht',
  (select idee_status from public.inzendingen where idee like 'Kom langs%') = 'verdacht');
select pg_temp.goed('gewoon idee is nieuw',
  (select bool_and(idee_status = 'nieuw') from public.inzendingen where idee = 'Meer bankjes in het park.'));
select pg_temp.goed('leeg idee is geen', (select count(*) from public.inzendingen where idee_status = 'geen') = 1);
select pg_temp.goed('e-mail los opgeslagen, in kleine letters',
  (select array_agg(email) from public.aanmeldingen) = array['a@example.nl']);
select pg_temp.goed('geen IP-adres opgeslagen',
  not exists (select 1 from prive.limieten where sleutel like '%203.0.113%' or sleutel like '%198.51%'));
select pg_temp.goed('geen extra velden in de keuzes',
  (select bool_and(keuzes - array['onderdelen','belastingen','kaarten','scenario','reserve'] = '{}') from public.inzendingen));

-- ---------- Als ingelogde gebruiker die geen fractielid is ----------
set role authenticated;
set request.jwt.claims = '{"email": "iemand@example.nl", "role": "authenticated"}';
select pg_temp.goed('niet-genodigde ziet niets', (select count(*) from public.inzendingen) = 0);
select pg_temp.goed('niet-genodigde ziet geen e-mailadressen', (select count(*) from public.aanmeldingen) = 0);
update public.inzendingen set idee_status = 'goedgekeurd';
reset role;
select pg_temp.goed('niet-genodigde kan niet modereren',
  (select count(*) from public.inzendingen where idee_status = 'goedgekeurd') = 0);

-- ---------- Als fractielid ----------
set role authenticated;
set request.jwt.claims = '{"email": "Raadslid@Example.nl", "role": "authenticated"}';
select pg_temp.goed('fractielid ziet alles', (select count(*) from public.inzendingen) = 6);
select pg_temp.goed('fractielid ziet aanmeldingen', (select count(*) from public.aanmeldingen) = 1);
update public.inzendingen set idee_status = 'goedgekeurd' where idee = 'Meer bankjes in het park.';
select pg_temp.moet_falen($$update public.inzendingen set idee = 'anders'$$, '42501');
select pg_temp.moet_falen($$update public.inzendingen set keuzes = '{}'$$, '42501');
select pg_temp.moet_falen($$update public.inzendingen set idee_status = 'goedgekeurd' where idee is null$$, 'Ongeldige status');
select pg_temp.moet_falen('delete from public.inzendingen', '42501');
select pg_temp.moet_falen($$insert into public.fractie_leden values ('ik@example.nl')$$, '42501');
reset role;
select pg_temp.goed('moderatie opgeslagen',
  (select count(*) from public.inzendingen where idee_status = 'goedgekeurd') = 2);

-- ---------- Bewaartermijn ----------
update public.inzendingen set aangemaakt = now() - interval '25 months' where idee is null;
select pg_temp.goed('opschonen verwijdert oude inzendingen', public.opschonen() = 1);
select pg_temp.goed('de rest blijft', (select count(*) from public.inzendingen) = 5);

-- ---------- Het filter doet hetzelfde als src/inzending/filter.ts ----------
\set gevallen `cat supabase/tests/filter-gevallen.json`
select pg_temp.goed('filter: ' || (g ->> 0), public.idee_verdacht(g ->> 0) = (g ->> 1)::boolean)
  from jsonb_array_elements(:'gevallen'::jsonb) g;

\echo 'Alle databasetests geslaagd.'
