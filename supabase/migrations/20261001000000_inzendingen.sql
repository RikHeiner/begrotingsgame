-- Inzendingen van de Begrotingsgame en het dashboard van de fractie (opdracht fase 5 en hoofdstuk 11).
--
-- Uitgangspunten:
-- * Spelers sturen alleen in via de functie public.insturen(). Ze kunnen de tabellen niet lezen of
--   rechtstreeks beschrijven.
-- * Opgeslagen worden alleen: de keuzes, het eigen idee, optioneel een gebied, en (los daarvan, met
--   een aparte toestemming) optioneel een e-mailadres. Geen IP-adressen.
-- * Rate limiting gebruikt een HMAC van het IP-adres en de datum, met een geheim dat niet via de API
--   bereikbaar is. Die tellers worden na een dag weggegooid. Het IP-adres zelf wordt nooit opgeslagen.
-- * Alleen genodigden (public.fractie_leden) zien de inzendingen en kunnen ideeën modereren.
-- * Bewaartermijn: 2 jaar (public.opschonen()).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists prive;
revoke all on schema prive from public;

-- ---------------------------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------------------------

create table public.inzendingen (
  id uuid primary key default gen_random_uuid(),
  aangemaakt timestamptz not null default now(),
  begrotingsjaar integer not null check (begrotingsjaar between 2020 and 2100),
  keuzes jsonb not null check (pg_column_size(keuzes) < 20000),
  missie text check (missie ~ '^[a-z0-9_]{1,40}$'),
  gebied text check (gebied ~ '^[a-z0-9_]{1,40}$'),
  idee text check (char_length(idee) <= 1000),
  -- geen: geen idee ingevuld; nieuw: nog niet bekeken; verdacht: het filter vond iets;
  -- goedgekeurd of verborgen: beoordeeld door de fractie
  idee_status text not null default 'geen'
    check (idee_status in ('geen', 'nieuw', 'verdacht', 'goedgekeurd', 'verborgen')),
  -- versie van de toestemmingstekst die de speler zag
  toestemming_versie integer not null check (toestemming_versie > 0)
);

create index inzendingen_aangemaakt on public.inzendingen (aangemaakt);

-- Los van de inzendingen: wie op de hoogte wil blijven. Er is bewust geen koppeling met een inzending.
create table public.aanmeldingen (
  id uuid primary key default gen_random_uuid(),
  aangemaakt timestamptz not null default now(),
  email text not null unique
    check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  toestemming_versie integer not null check (toestemming_versie > 0)
);

-- Genodigden voor het dashboard. Beheer via het Supabase-dashboard (SQL of tabel-editor).
create table public.fractie_leden (
  email text primary key check (email = lower(email)),
  toegevoegd timestamptz not null default now()
);

-- Woorden waarop het filter een idee als 'verdacht' markeert (het idee wordt niet geweigerd).
-- Dezelfde lijst staat in src/inzending/filter.ts; een test bewaakt dat ze gelijk blijven.
create table prive.filter_woorden (woord text primary key);
insert into prive.filter_woorden (woord) values
  ('kanker'), ('tering'), ('tyfus'), ('klootzak'), ('kut'), ('lul'), ('hoer'), ('mongool'),
  ('flikker'), ('neuken'), ('godverdomme'), ('debiel'), ('eikel'), ('sukkel'), ('idioot'),
  ('oplichter'), ('zakkenvuller'), ('landverrader');

create table prive.instellingen (
  sleutel text primary key,
  waarde text not null
);
insert into prive.instellingen (sleutel, waarde) values
  ('geheim', encode(extensions.gen_random_bytes(32), 'hex')),
  ('max_per_uur', '5'),
  ('max_totaal_per_uur', '2000'),
  ('bewaren_maanden', '24');

create table prive.limieten (
  sleutel text not null,
  uur timestamptz not null,
  aantal integer not null default 0,
  primary key (sleutel, uur)
);

-- ---------------------------------------------------------------------------------------------
-- Rechten. Supabase geeft anon en authenticated standaard alle rechten op nieuwe tabellen in
-- public; die nemen we eerst weg en daarna geven we alleen wat nodig is.
-- ---------------------------------------------------------------------------------------------

revoke all on public.inzendingen, public.aanmeldingen, public.fractie_leden from anon, authenticated;
alter table public.inzendingen enable row level security;
alter table public.aanmeldingen enable row level security;
alter table public.fractie_leden enable row level security;

create function public.is_fractie() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.fractie_leden
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_fractie() from public, anon;
grant execute on function public.is_fractie() to authenticated;

grant select on public.inzendingen to authenticated;
grant update (idee_status) on public.inzendingen to authenticated;
grant select, delete on public.aanmeldingen to authenticated;

create policy "fractie leest inzendingen" on public.inzendingen
  for select to authenticated using (public.is_fractie());
create policy "fractie modereert ideeën" on public.inzendingen
  for update to authenticated using (public.is_fractie()) with check (public.is_fractie());
create policy "fractie leest aanmeldingen" on public.aanmeldingen
  for select to authenticated using (public.is_fractie());
create policy "fractie verwijdert aanmeldingen" on public.aanmeldingen
  for delete to authenticated using (public.is_fractie());

-- Een idee mag alleen op goedgekeurd of verborgen worden gezet, en een leeg idee blijft 'geen'.
create function prive.controleer_moderatie() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.idee_status is distinct from old.idee_status then
    if old.idee_status = 'geen' or new.idee_status not in ('goedgekeurd', 'verborgen', 'nieuw') then
      raise exception 'Ongeldige status: %', new.idee_status using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
create trigger moderatie before update on public.inzendingen
  for each row execute function prive.controleer_moderatie();

-- ---------------------------------------------------------------------------------------------
-- Filter op scheldwoorden en persoonsgegevens
-- ---------------------------------------------------------------------------------------------

create function public.idee_verdacht(tekst text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    tekst ~* '[^\s@]+@[^\s@]+\.[a-z]{2,}'                                -- e-mailadres
    or tekst ~ '(\+31|\m0)[\s-]?[1-9]([\s-]?[0-9]){8}'                   -- telefoonnummer
    or tekst ~* '\m[1-9][0-9]{3}\s?[a-z]{2}\M\s*,?\s*[0-9]+'               -- postcode met huisnummer
    or tekst ~* '\mNL[0-9]{2}[A-Z]{4}[0-9]{10}\M'                           -- IBAN
    or exists (select 1 from prive.filter_woorden w where lower(tekst) ~ ('\m' || w.woord));
$$;
revoke all on function public.idee_verdacht(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Insturen
-- ---------------------------------------------------------------------------------------------

create function prive.getallen_geldig(x jsonb, ondergrens numeric, bovengrens numeric) returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(x) = 'object'
    and (select count(*) from jsonb_object_keys(x)) <= 300
    and not exists (
      select 1 from jsonb_each(x) e
      where e.key !~ '^[a-z0-9_:]{1,60}$'
        or case
          when jsonb_typeof(e.value) <> 'number' then true
          else (e.value)::numeric not between ondergrens and bovengrens
        end
    );
$$;

create function public.insturen(inzending jsonb) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  k jsonb := inzending -> 'keuzes';
  v_idee text := nullif(btrim(coalesce(inzending ->> 'idee', '')), '');
  v_email text := nullif(lower(btrim(coalesce(inzending ->> 'email', ''))), '');
  versie integer;
  ip text;
  geheim text;
  dit_uur timestamptz := date_trunc('hour', now());
  ip_sleutel text;
  teller integer;
  nieuw_id uuid;
begin
  -- Spamfilter: een verborgen veld dat mensen niet zien, en een minimale speelduur.
  if coalesce(inzending ->> 'website', '') <> '' or coalesce((inzending ->> 'duur_ms')::numeric, 0) < 3000 then
    raise exception 'Inzending geweigerd.' using errcode = '22023';
  end if;
  if coalesce((inzending ->> 'toestemming')::boolean, false) is not true then
    raise exception 'Zonder toestemming kunnen we niets opslaan.' using errcode = '22023';
  end if;
  versie := (inzending ->> 'toestemming_versie')::integer;

  -- Keuzes controleren
  if jsonb_typeof(k) <> 'object'
    or not prive.getallen_geldig(coalesce(k -> 'onderdelen', '{}'), -100, 1000)
    or not prive.getallen_geldig(coalesce(k -> 'belastingen', '{}'), -100, 1000)
    or jsonb_typeof(coalesce(k -> 'kaarten', '[]')) <> 'array'
    or jsonb_array_length(coalesce(k -> 'kaarten', '[]')) > 200
    or exists (
      select 1 from jsonb_array_elements(coalesce(k -> 'kaarten', '[]')) x
      where jsonb_typeof(x) <> 'string' or (x #>> '{}') !~ '^[a-z0-9_:]{1,60}$'
    )
    or coalesce(k ->> 'scenario', 'midden') not in ('voorzichtig', 'midden', 'optimistisch')
    or (k ? 'reserve' and not prive.getallen_geldig(k -> 'reserve', 0, 1e10))
  then
    raise exception 'De keuzes kloppen niet.' using errcode = '22023';
  end if;

  -- Rate limiting per (gehasht) IP-adres en in totaal
  ip := split_part(coalesce(
    current_setting('request.headers', true)::jsonb ->> 'cf-connecting-ip',
    current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for',
    'onbekend'), ',', 1);
  select waarde into geheim from prive.instellingen i where i.sleutel = 'geheim';
  ip_sleutel := encode(extensions.hmac(btrim(ip) || '|' || current_date::text, geheim, 'sha256'), 'hex');
  delete from prive.limieten where limieten.uur < now() - interval '1 day';
  insert into prive.limieten as l (sleutel, uur, aantal) values (ip_sleutel, dit_uur, 1)
    on conflict (sleutel, uur) do update set aantal = l.aantal + 1
    returning l.aantal into teller;
  if teller > (select waarde::integer from prive.instellingen i where i.sleutel = 'max_per_uur') then
    raise exception 'Je hebt al vaak ingestuurd. Probeer het later nog eens.' using errcode = 'PT429';
  end if;
  insert into prive.limieten as l (sleutel, uur, aantal) values ('totaal', dit_uur, 1)
    on conflict (sleutel, uur) do update set aantal = l.aantal + 1
    returning l.aantal into teller;
  if teller > (select waarde::integer from prive.instellingen i where i.sleutel = 'max_totaal_per_uur') then
    raise exception 'Het is nu erg druk. Probeer het later nog eens.' using errcode = 'PT429';
  end if;

  insert into public.inzendingen (begrotingsjaar, keuzes, missie, gebied, idee, idee_status, toestemming_versie)
  values (
    (inzending ->> 'begrotingsjaar')::integer,
    jsonb_strip_nulls(jsonb_build_object(
      'onderdelen', coalesce(k -> 'onderdelen', '{}'),
      'belastingen', coalesce(k -> 'belastingen', '{}'),
      'kaarten', coalesce(k -> 'kaarten', '[]'),
      'scenario', coalesce(k ->> 'scenario', 'midden'),
      'reserve', k -> 'reserve'
    )),
    nullif(inzending ->> 'missie', ''),
    nullif(inzending ->> 'gebied', ''),
    v_idee,
    case when v_idee is null then 'geen' when public.idee_verdacht(v_idee) then 'verdacht' else 'nieuw' end,
    versie
  )
  returning id into nieuw_id;

  -- Op de hoogte blijven: alleen met een aparte toestemming, en los van de inzending opgeslagen.
  if v_email is not null then
    if coalesce((inzending ->> 'email_toestemming')::boolean, false) is not true then
      raise exception 'Voor je e-mailadres is een aparte toestemming nodig.' using errcode = '22023';
    end if;
    insert into public.aanmeldingen (email, toestemming_versie) values (v_email, versie)
      on conflict (email) do nothing;
  end if;

  return nieuw_id;
end;
$$;
revoke all on function public.insturen(jsonb) from public;
grant execute on function public.insturen(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Bewaartermijn
-- ---------------------------------------------------------------------------------------------

create function public.opschonen() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  maanden integer := (select waarde::integer from prive.instellingen where sleutel = 'bewaren_maanden');
  weg integer;
begin
  delete from public.inzendingen where aangemaakt < now() - make_interval(months => maanden);
  get diagnostics weg = row_count;
  delete from public.aanmeldingen where aangemaakt < now() - make_interval(months => maanden);
  delete from prive.limieten where uur < now() - interval '1 day';
  return weg;
end;
$$;
revoke all on function public.opschonen() from public, anon, authenticated;

-- Elke nacht opschonen, als pg_cron aanstaat (in Supabase: Database > Extensions > pg_cron).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('begrotingsgame-opschonen', '17 3 * * *', 'select public.opschonen()');
  end if;
end;
$$;
