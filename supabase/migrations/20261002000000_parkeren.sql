-- Parkeren per vergunning en zone (data/parkeren-JJJJ.json): de keuzes staan in keuzes.parkeren,
-- met sleutels als "bewoners_1:tweede". De functie insturen neemt dat veld nu ook over, met
-- dezelfde controle als de andere schuiven. Verder is de functie gelijk aan de eerste migratie.

create or replace function public.insturen(inzending jsonb) returns uuid
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
    or not prive.getallen_geldig(coalesce(k -> 'parkeren', '{}'), -100, 1000)
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
      'parkeren', k -> 'parkeren',
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
