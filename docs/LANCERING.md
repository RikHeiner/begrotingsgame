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

## Cookies en privacy (nagelopen 3 oktober 2026)

- **Cookies:** de game zet geen cookies en laadt geen trackers, advertenties of analytics. Er gaat
  niets naar Google (lettertypes staan op onze eigen server).
- **Lokale opslag:** alleen wat nodig is om de game te laten werken (uitleg gezien, beginscherm
  gezien, geluid, je eigen begroting, gespeelde minigames en beste score). Dat is "strikt
  noodzakelijk" (artikel 11.7a Telecommunicatiewet), dus er is **geen cookiebanner** nodig. Alles
  staat in `privacy.html`.
- **Insturen:** alleen na toestemming (AVG artikel 6 lid 1 onder a); e-mailadres apart en los van de
  begroting; bewaartermijn 2 jaar.
- **Nog open:**
  1. Wie is formeel de **verwerkingsverantwoordelijke** (de vereniging VVD Groningen of de
     fractie)? Zet de juiste naam in `privacy.html`.
  2. **Verwerkersovereenkomsten** met Supabase en Netlify afsluiten (zie hierboven).
  3. Netlify houdt serverlogs met IP-adressen bij; dat staat nu in de privacyverklaring.

## App Store en Google Play

De game is een **PWA**: je kunt hem nu al op je beginscherm zetten (iPhone: Deel → Zet op
beginscherm; Android: Installeren). Om in de winkels te komen:

- **Google Play:** kan als _Trusted Web Activity_ (bijvoorbeeld met Bubblewrap/PWABuilder). Nodig:
  ontwikkelaarsaccount (eenmalig $ 25), privacybeleid-URL, het formulier _Data safety_,
  leeftijdsclassificatie, en `assetlinks.json` op het domein.
- **Apple App Store:** lastiger. Nodig: Apple Developer Program (€ 99 per jaar), een
  verpakking met Capacitor, privacy-labels en een privacybeleid-URL. Apple wijst apps af die
  "alleen een website" zijn (richtlijn 4.2): de app moet echt als app werken (offline, goed op
  iPhone). Politieke inhoud mag, maar alleen als de **partij zelf** de app indient (richtlijn 5.1,
  eigen account op naam van de organisatie, met D-U-N-S-nummer).
- **Advies:** eerst als PWA lanceren en delen via een link/QR-code. Een winkelversie kost tijd en
  geld en voegt voor een game rond de begroting weinig toe.
