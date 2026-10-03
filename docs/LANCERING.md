# Lancering: stappenplan

Wat nog moet gebeuren voordat de Begrotingsgame live gaat (fase 8). Wat al klaar is, staat onderaan.

## 1. Domein en hosting

1. **Kies een domein**, bijvoorbeeld een subdomein van de fractiesite (`begroting.…`) of een eigen
   naam. Registreren gaat bij een registrar naar keuze.
2. **Kies hosting in de EU** die statische sites serveert en headers uit een bestand `_headers`
   leest, zoals Netlify of Cloudflare Pages. Zet in de instellingen van de hosting:
   - bouwcommando: `npm ci && npm run build`
   - map met de site: `dist`
   - omgevingsvariabelen: `VITE_SITE_URL` (het adres van de site, zonder `/` aan het eind), en
     voor het insturen `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`
     (zie [SUPABASE-INSTELLEN.md](SUPABASE-INSTELLEN.md)).
3. **DNS**: laat het domein naar de hosting wijzen (de hosting geeft de records). HTTPS gaat
   daarna automatisch.
4. **Controleer de headers** op de live site: `curl -I https://jouw-domein.nl/` moet onder andere
   `Content-Security-Policy`, `Strict-Transport-Security` en `X-Content-Type-Options` tonen. Leest
   de hosting `_headers` niet, zet dan dezelfde headers met de hand (ze staan in `dist/_headers`).
5. **Supabase**: zet het nieuwe adres in _Authentication → URL Configuration_ (Site URL en
   `…/dashboard.html` bij de Redirect URLs).
6. **Delen testen**: plak de link in WhatsApp of een LinkedIn-bericht en controleer of de
   afbeelding (`og-afbeelding.png`) en de titel verschijnen. Is de kaart veranderd, maak de
   afbeelding dan opnieuw met `npm run build && npm run og`.

**Alleen publiceren op verzoek.** `netlify.toml` laat Netlify een build overslaan, tenzij `[netlify]` in het laatste commitbericht staat. Vraag Claude dus om "zet het op Netlify": dan komt er een commit met `[netlify]` en bouwt Netlify de nieuwe versie.

## 2. Teksten invullen

In `privacy.html` en `toegankelijkheid.html` zijn het e-mailadres van de fractie
(vvdgroningenstad@gmail.com) en de hosting (Netlify) ingevuld.

**Nog open:** er is nog geen **verwerkersovereenkomst** met Supabase en Netlify (stand oktober
2026). Sluit die af voordat inzendingen met persoonsgegevens worden opgeslagen (bij Supabase via
_Settings → Legal_, bij Netlify via hun standaard-DPA). Daarna kan in de privacyverklaring weer de
zin terug dat die overeenkomsten er zijn.

## 3. Laatste controles

- [ ] `npm run bedragen:controle` en loop `docs/CONTROLE-BEDRAGEN.md` na met het boekwerk ernaast.
      Open punten staan in `data/BEVINDINGEN.md` (onder andere de parkeeropbrengst en de tarieven).
- [ ] Test met vijf inwoners: zie [GEBRUIKERSTEST.md](GEBRUIKERSTEST.md).
- [ ] Meet de kaart op een echte middenklasse telefoon (60 beelden per seconde bij slepen en zoomen).
- [ ] Lighthouse op de live site, mobiel: prestaties, toegankelijkheid en best practices 90 of hoger.
- [ ] Insturen en het dashboard met het echte Supabase-project: één proefinzending, daarna weer
      verwijderen.

## Al klaar

| Onderwerp                                             | Waar                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Privacy- en toegankelijkheidsverklaring (B1)          | `privacy.html`, `toegankelijkheid.html`                          |
| Afbeelding en tekst bij een gedeelde link             | `public/og-afbeelding.png`, `index.html`, `npm run og`           |
| Content Security Policy (geen inline scripts of eval) | in elke pagina van de build, en `dist/_headers`                  |
| Beveiligingsheaders voor de hosting                   | `dist/_headers` (gemaakt bij `npm run build`)                    |
| Dashboard niet in zoekmachines                        | `robots.txt`, `X-Robots-Tag` en `noindex`                        |
| Toegankelijkheid                                      | automatische tests met axe op alle schermen, licht en donker     |
| Lighthouse in de testomgeving (mobiel)                | prestaties 97, toegankelijkheid 100, best practices 100, SEO 100 |
