# Begrotingsgame gemeente Groningen

Een game waarin inwoners hun eigen tegenbegroting maken voor de gemeente Groningen.
Een initiatief van de VVD-fractie Groningen-Haren. De volledige opdracht staat in
[`PROMPT-claude-code.md`](PROMPT-claude-code.md).

Stand: **fase 0 (opzet)**. Er is een lege pagina die het actieve begrotingsjaar uit de data laadt.

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

## Mapstructuur

```
data/            begrotingsdata, dwarsverbanden, tegenbegroting, kaart, config.json
prototype/       het oorspronkelijke prototype (alleen ter referentie)
src/engine/      pure rekenmotor (geen React, geen DOM; afgedwongen met ESLint)
src/app/         de React-app
tests/e2e/       Playwright-tests
scripts/         data-check, data-diff, vvd-check (vanaf fase 1)
```

## Een nieuwe begroting inladen

Zie [`UPDATE-BEGROTING.md`](UPDATE-BEGROTING.md). De tooling (`npm run data:check`,
`npm run data:diff`) komt in fase 1.

## CI

GitHub Actions (`.github/workflows/ci.yml`) draait bij elke push: lint, formattering, typecheck,
Vitest, build en Playwright.
