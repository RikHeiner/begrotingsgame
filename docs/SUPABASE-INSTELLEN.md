# Supabase instellen voor inzendingen en het dashboard

Dit is eenmalig werk. Daarna kunnen spelers hun begroting insturen en ziet de fractie alles in het
dashboard (`/dashboard.html`).

## 1. Project maken

1. Maak een account op [supabase.com](https://supabase.com) en een nieuw project.
2. Kies als regio **Frankfurt (eu-central-1)** of een andere regio in de EU.
3. Sluit de verwerkersovereenkomst (DPA) met Supabase af: _Settings → Legal_.

## 2. Database inrichten

1. Open _SQL Editor_ in het Supabase-dashboard.
2. Plak de inhoud van `supabase/migrations/20261001000000_inzendingen.sql` en klik op _Run_.
   (Met de Supabase CLI kan het ook: `supabase db push`.)
3. Zet de extensie **pg_cron** aan (_Database → Extensions_), als dat nog niet was gedaan voor
   stap 2. Voer daarna in de SQL Editor uit:
   `select cron.schedule('begrotingsgame-opschonen', '17 3 * * *', 'select public.opschonen()');`
   Zo worden inzendingen na 2 jaar automatisch verwijderd. (Stond pg_cron al aan bij stap 2, dan
   heeft de migratie dit zelf gedaan.)

## 3. Inloggen voor de fractie

1. _Authentication → Sign In / Providers_: zet **Email** aan, en zet **Allow new users to sign up**
   uit. Alleen wie is uitgenodigd, kan dan inloggen.
2. _Authentication → URL Configuration_: zet de **Site URL** op het adres van de game en voeg
   `https://jouw-domein.nl/dashboard.html` toe aan de **Redirect URLs**.
3. Nodig elk fractielid uit: _Authentication → Users → Invite user_.
4. Geef hem of haar ook toegang tot de inzendingen (SQL Editor):

   ```sql
   insert into public.fractie_leden (email) values ('naam@voorbeeld.nl');
   ```

   Weghalen: `delete from public.fractie_leden where email = 'naam@voorbeeld.nl';`
   Alleen beide stappen samen geven toegang: inloggen én op de lijst staan.

## 4. De game koppelen

1. _Settings → API_: kopieer de **Project URL** en de **anon public key**.
2. Zet ze bij de hosting als omgevingsvariabelen (of lokaal in `.env.local`):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ…
   ```

3. Bouw de game opnieuw (`npm run build`). De knop **Stuur in naar de fractie** verschijnt op het
   eindscherm. Zonder deze instellingen is de knop verborgen.

De anon key is openbaar; dat hoort zo. De beveiliging zit in de database: spelers kunnen alleen de
functie `insturen` aanroepen en niets lezen. Gebruik de **service_role key** nooit in de game.

## Wat de database doet

| Onderwerp        | Hoe                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toestemming      | Zonder vinkje weigert `insturen` de inzending. De versie van de tekst wordt bewaard.                                                                              |
| E-mailadres      | Alleen met een tweede vinkje, in een aparte tabel zonder koppeling met de inzending.                                                                              |
| Geen IP-adressen | Voor rate limiting wordt een HMAC van IP-adres + datum bewaard, met een geheim dat niet via de API bereikbaar is. Die tellers verdwijnen na een dag.              |
| Rate limiting    | 5 inzendingen per uur per adres en 2.000 per uur in totaal (aan te passen in `prive.instellingen`).                                                               |
| Spam             | Een verborgen veld en een minimale speelduur van 3 seconden.                                                                                                      |
| Ideeën           | Het filter markeert persoonsgegevens en scheldwoorden als _verdacht_; de fractie keurt goed of verbergt.                                                          |
| Toegang          | Row level security: alleen e-mailadressen in `fractie_leden` lezen inzendingen en aanmeldingen. Niemand kan inzendingen wijzigen, behalve de status van een idee. |
| Bewaartermijn    | 2 jaar (`prive.instellingen`, sleutel `bewaren_maanden`), elke nacht via `public.opschonen()`.                                                                    |

De regels worden getest met `npm run db:test` (een tijdelijke Postgres met een kleine
nabootsing van Supabase, zie `supabase/tests/`). Dat draait ook in CI.
