# Begrotingsgame gemeente Groningen

Een game waarin inwoners hun eigen tegenbegroting maken voor de gemeente Groningen.
Een initiatief van de VVD-fractie Groningen-Haren. De volledige opdracht staat in
[`PROMPT-claude-code.md`](PROMPT-claude-code.md).

Stand: **fase 8 (klaar voor de lancering, op een paar in te vullen punten na)**. De game is speelbaar (kaart, HUD, panelen met schuif én bedrag, tutorial, inwoners, "Wat betekent het voor mij?", eindscherm, deellink, geluid, offline). De tegenbegroting gaat naar Word, PDF en een afbeelding. Spelers kunnen hun begroting met toestemming insturen; de fractie ziet alles in een afgeschermd dashboard (`/dashboard.html`). Wat er nog moet gebeuren voor de lancering, staat in [docs/LANCERING.md](docs/LANCERING.md). De debugpagina van de rekenmotor staat op `/#debug`.

## Starten

Nodig: Node.js 20 of hoger (CI gebruikt 22).

```bash
npm install
npm run dev        # ontwikkelserver op http://localhost:5173
```

## Testen en controleren

```bash
npm run lint           # ESLint (TypeScript strict, geen any)
npm run format:check   # Prettier (npm run format om te herstellen)
npm run typecheck      # TypeScript
npm test               # unit tests van de rekenmotor (Vitest)
npm run test:e2e       # end-to-end tests en screenshots (Playwright, 360×800, 390×844, 1440×900)
npm run data:check     # controleert alle data (zie hieronder)
npm run vvd:check      # rekent de VVD-tegenbegroting na met de schuiven van de game
npm run vvd:word -- uit.docx  # maakt de VVD-tegenbegroting na in de game en schrijft hem als Word-bestand
npm run db:test        # test de Supabase-migraties (rechten, insturen, filter) op een tijdelijke Postgres
npm run bedragen:controle  # schrijft docs/CONTROLE-BEDRAGEN.md: alle bedragen met bron, en controles
npm run woonlasten:ophalen  # haalt de woonlasten per gemeente op bij COELO en CBS (data/woonlasten-JJJJ.json)
npm run og             # maakt public/og-afbeelding.png opnieuw (na npm run build)
npm run personas:overzicht  # docs/INWONERS-AFSTEMMEN.md voor de fractie
npm run iconen         # PWA-iconen opnieuw maken uit public/icoon.svg
npm run geluiden       # geluidjes opnieuw maken (public/geluid/)
```

Screenshots van de Playwright-tests staan daarna in `test-results/`.
Eenmalig, buiten de cloudomgeving: `npx playwright install chromium`.

## Bouwen

```bash
npm run build      # statische site in dist/
npm run preview    # bekijk de build op http://localhost:4173
```

## Data en code

- Alle begrotingsdata staat in `data/`. De code kent geen bedragen.
- `data/config.json` bepaalt het actieve begrotingsjaar, het begrotingsbestand, de vergelijking en de
  meerjarenhorizon.
- De map `data/` wordt niet in de JavaScript-bundel gestopt, maar als losse bestanden geserveerd op
  `/data/` (tijdens ontwikkelen) en meegekopieerd naar `dist/data/` (bij de build). Een nieuw
  databestand vraagt dus geen codewijziging. Alleen `.json` en `.geojson` gaan mee; documentatie
  (`.md`) niet.
- Prettier laat `data/` met rust: de bronbestanden blijven zoals ze zijn aangeleverd.

## De rekenmotor

`src/engine/` is pure TypeScript: geen React, geen DOM (ESLint dwingt dat af). De ingang is
`src/engine/index.ts`:

- `laadData(haal)` laadt en valideert alle data voor het jaar in `config.json`;
- `bereken(data, keuzes)` geeft het saldo per jaar (structureel en eenmalig), de meters, de inwoners,
  alle effecten (met uitleg en zekerheid), de meldingen en de status van elk dwarsverband;
- `magWijzigen(data, huidig, nieuw)` is het slot op de pot.

De afspraken over hoe de motor de data leest staan in [`data/SCHEMA.md`](data/SCHEMA.md). Fouten en
vragen over de data staan in [`data/BEVINDINGEN.md`](data/BEVINDINGEN.md).

## Mapstructuur

```
data/            begrotingsdata, dwarsverbanden, tegenbegroting, kaart, config.json
prototype/       het oorspronkelijke prototype (alleen ter referentie)
src/engine/      pure rekenmotor (geen React, geen DOM; afgedwongen met ESLint)
src/game/        kaart (Canvas 2D), toestand van gebouwen, tekstballonnen, Zustand-store
src/ui/          kaartweergave, gebouwpaneel, lijstweergave
src/app/         de React-app (spel en debugpagina)
src/inzending/   insturen: opslag (Supabase of lokaal), filter op ideeën
src/dashboard/   het dashboard voor de fractie (dashboard.html)
supabase/        migraties en databasetests
tests/e2e/       Playwright-tests
scripts/         data-check, data-diff, vvd-check, vvd-word, db-test
```

## Het spel

- Geen missies: iedereen maakt zijn eigen begroting. Het eindscherm geeft drie sterren voor een
  gezonde begroting (sluit in alle jaren, elk jaar een buffer, geen eenmalig geld voor vaste lasten).
- `data/spel/badges.json`: badges en de buffer voor de derde ster. Voorwaarden gebruiken dezelfde
  veilige expressietaal als de tekstballonnen.
- Elke schuif heeft ook een invoerveld: typ het nieuwe budget, de nieuwe opbrengst of (bij
  parkeervergunningen) het nieuwe tarief, en de game rekent het percentage uit. De grenzen van de
  schuif gelden ook voor het bedrag.
- De score voor blije inwoners en de meters staan niet meer in beeld: ze namen de huidige begroting
  als nulpunt (50), en dat zegt niets over hoe tevreden mensen nu zijn. De rekenmotor houdt ze nog
  bij (voor de kettingeffecten en de debugpagina). De inwoners laten in woorden zien wat ze merken.
- `data/spel/teksten.json`: de tutorial en vaste teksten.
- `data/config.json`: `vergelijkingTonen` zet de vergelijking met de tegenbegroting op het eindscherm aan of uit.
- De keuzes staan in de URL (`?b=…`, gecomprimeerd met lz-string): elke begroting is een deelbare link.
- De game werkt na het eerste bezoek ook offline (service worker met de data erin).
- Lettertypen (Baloo 2 en Asap) worden zelf gehost; er gaat niets naar Google Fonts.

## De tegenbegroting als document

- `src/game/tegenbegroting/document.ts` maakt één documentmodel uit de keuzes. Word, PDF en de
  afbeelding komen allemaal hieruit, dus de bedragen zijn overal gelijk.
- De opbouw volgt de VVD-tegenbegroting: voorblad, inleiding, besparingen en investeringen per thema,
  kettingeffecten (apart en gemarkeerd als aanname), eigen ideeën, gevolgen, financieel overzicht met
  S/I-tabellen en meerjarig saldo, bronnen.
- Word (`word.ts`, met de bibliotheek docx) en de afbeelding (`src/ui/tegenbegroting/afbeelding.ts`,
  canvas) worden pas geladen als de speler op de knop drukt. PDF gaat via printen, met een eigen
  printopmaak (A4).
- Controle: de VVD-testcase in Word geeft dezelfde totalen als het origineel (op de bekende afwijkingen
  na, zie `data/BEVINDINGEN.md`). Test: `src/game/__tests__/tegenbegroting.test.ts`.

## Persoonlijke impact

- **Campagne**: de campagnemodus en de gebeurteniskaarten zijn uit de game gehaald (zie
  `data/BEVINDINGEN.md` punt 51).
- **Inwoners**: in de dialoog onder het gezichtje in de HUD. Per inwoner de situatie, de
  tevredenheid en de drie keuzes die hij of zij het meest merkt.
- **Wat betekent het voor mij?**: in diezelfde dialoog en op het eindscherm. Koop of huur,
  WOZ-waarde, gezin, parkeervergunning en inkomen. Rekent met de tarieven uit
  `data/tarieven-JJJJ.json` (in `config.json` onder `tarieven`) en, voor de parkeervergunningen,
  met het tarief van je eigen zone uit `data/parkeren-JJJJ.json`. Er wordt niets opgeslagen.

## Parkeren per vergunning en zone

`data/parkeren-JJJJ.json` (in `config.json` onder `parkeren`) verdeelt de parkeeropbrengst van de
schuif t5 in posten, elk met een eigen schuif bij de Parkeergarage (`src/engine/parkeren.ts`):

- **vergunningen**: aantal × tarief, voor bewoners per tariefgebied (binnenstad, tweede zone, derde
  tot en met vijfde zone); daarnaast bezoekers, bedrijven, mantelzorg en maatschappelijk;
- **kortparkeren en overig**: de parkeerbelasting uit de kerngegevens min de vergunningen (één
  schuif; de uurtarieven per zone staan bij "Waarom ⚠︎?");
- **parkeergarages**: de opbrengst in de begroting min de parkeerbelasting.

Samen is dat precies de opbrengst van t5. De keuzes staan in `keuzes.parkeren` (sleutels als
`bewoners_1:tweede`), de effecten hebben als bron `t5:<post>`. De schuif t5 wordt het gewogen
gemiddelde, zodat kettingeffecten en inwoners blijven werken; een oude keuze voor t5 (deellink)
geldt voor alle posten. In reacties kan `park.bewoners_1.tweede`, in persona's
`t5:bewoners_1:tweede`.

Elk tarief heeft een `prijspeil` en elk aantal een `peiljaar`. Een tarief van een eerder jaar wordt
omgerekend met `indexatie`; zonder indexatie waarschuwt `npm run data:check`. Zie
`UPDATE-BEGROTING.md` stap 5.

## Lancering, privacy en beveiliging

- Stappenplan: [docs/LANCERING.md](docs/LANCERING.md). Test met inwoners:
  [docs/GEBRUIKERSTEST.md](docs/GEBRUIKERSTEST.md).
- `privacy.html` en `toegankelijkheid.html`: de verklaringen op B1-niveau.
- De build zet een Content Security Policy in elke pagina (geen inline scripts, stijlen of eval) en
  maakt `dist/_headers` met beveiligingsheaders voor de hosting. `VITE_SITE_URL` is het adres van de
  site voor de Open Graph-tags.
- Toegankelijkheid: `tests/e2e/toegankelijkheid.spec.ts` controleert alle schermen met axe
  (WCAG 2.1 A en AA), licht en donker. `tests/e2e/csp.spec.ts` controleert dat de CSP niets blokkeert.

## Persoonlijke video (fase 7: vervallen)

Besloten is om geen video te maken; de tegenbegroting blijft als Word, pdf en afbeelding. Het
ontwerp en de kostenraming staan voor later in [docs/VIDEO-ONTWERP.md](docs/VIDEO-ONTWERP.md).

## Inzendingen en dashboard

- **Insturen** (`src/inzending/`, `src/ui/eindscherm/InstuurDialoog.tsx`): alleen na toestemming.
  Opgeslagen worden de keuzes, het eigen idee en optioneel een gebied (een van de zeven gebieden van
  de gemeente). Een e-mailadres alleen met een aparte toestemming, los van de inzending. Geen naam
  en geen IP-adres. De teksten staan in `data/spel/teksten.json` (`insturen`).
- **Database** (`supabase/migrations/`): row level security, de functie `insturen` met controles,
  rate limiting en een filter op persoonsgegevens en scheldwoorden, en een bewaartermijn van 2 jaar.
- **Dashboard** (`dashboard.html`, `src/dashboard/`): inloggen met een magic link, alleen voor
  genodigden. Kerncijfers, per post hoe vaak en hoeveel, een heatmap per gebied, de populairste
  combinaties, ideeën met zoeken en moderatie, en een CSV voor Excel (puntkomma, decimale komma).
  Elke inzending wordt opnieuw doorgerekend met de rekenmotor.
- **Zonder Supabase** (tijdens `npm run dev`, of met `VITE_OPSLAG=lokaal`) gaan inzendingen naar de
  browser. Zo werken de demo en de Playwright-tests. In een gewone build zonder Supabase is de knop
  Insturen verborgen.

## De kaart

- `data/spel/kaart.json`: middelpunt (Grote Markt), vergroting, toestandsdrempels, water en labels.
- `data/spel/gebieden.json`: de zeven gebieden van de gemeente met hun CBS-buurten.
- `data/spel/gebouwen.json`: de 14 gebouwen met buurt, gebied, positie en kleuren.
- `data/spel/reacties.json`: de tekstballonnen; de voorwaarden gebruiken een eigen, veilige expressietaal
  (`src/engine/expressie.ts`).
- De kaart is een canvas (Canvas 2D), pas geladen als hij in beeld komt. De vaste laag (buurten,
  water, wegen, namen) en elk gebouw zijn kant-en-klare afbeeldingen; een beeld tekenen is vooral
  drawImage. De kaart tekent alleen als er iets verandert, en de inwoners lopen na een actie van de
  speler 30 seconden mee. Lighthouse (mobiel): prestaties 97, toegankelijkheid 100, best practices 100.
- Op de kaart liggen onzichtbare knoppen op de gebouwen, zodat je met Tab en Enter een gebouw kiest.
  De lijstweergave (knop "Lijst") heeft dezelfde functies en werkt met een schermlezer.

## Een nieuwe begroting inladen

Zie [`UPDATE-BEGROTING.md`](UPDATE-BEGROTING.md) voor de hele werkwijze. Kort:

```bash
npm run data:check data/begroting-2027.json   # valideert een nieuw bestand (fouten: code 1)
npm run data:check -- --alles                 # ook de meldingen (nog niet doorgerekend, enz.)
npm run data:diff 2026 2027                   # verschillen in Markdown (gebruikt data/mappings/)
npm test                                      # alle tests
```

Daarna in `data/config.json` het actieve jaar, het bestand, de horizon, het tarievenbestand
(`tarieven-JJJJ.json`) en het parkeerbestand (`parkeren-JJJJ.json`) aanpassen. Let bij de tarieven
en de parkeerdata op het jaartal van elk bedrag (stap 5 in `UPDATE-BEGROTING.md`).

## CI

GitHub Actions (`.github/workflows/ci.yml`) draait bij elke push: lint, formattering, typecheck,
data-check, Vitest, build en Playwright.
