# Begrotingsgame gemeente Groningen

Een game waarin inwoners hun eigen tegenbegroting maken voor de gemeente Groningen.
Een initiatief van de VVD-fractie Groningen-Haren. De volledige opdracht staat in
[`PROMPT-claude-code.md`](PROMPT-claude-code.md).

Stand: **fase 1 (data en rekenmotor)**. De rekenmotor werkt en is getest. De pagina is nog een debugpagina met schuiven en tabellen; de echte game volgt in fase 2 en 3.

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
src/app/         de React-app
tests/e2e/       Playwright-tests
scripts/         data-check, data-diff, vvd-check
```

## Een nieuwe begroting inladen

Zie [`UPDATE-BEGROTING.md`](UPDATE-BEGROTING.md) voor de hele werkwijze. Kort:

```bash
npm run data:check data/begroting-2027.json   # valideert een nieuw bestand (fouten: code 1)
npm run data:check -- --alles                 # ook de meldingen (nog niet doorgerekend, enz.)
npm run data:diff 2026 2027                   # verschillen in Markdown (gebruikt data/mappings/)
npm test                                      # alle tests
```

Daarna in `data/config.json` het actieve jaar, het bestand en de horizon aanpassen.

## CI

GitHub Actions (`.github/workflows/ci.yml`) draait bij elke push: lint, formattering, typecheck,
data-check, Vitest, build en Playwright.
