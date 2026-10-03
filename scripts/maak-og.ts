/**
 * npm run og
 * Maakt public/og-afbeelding.png (1200 × 630): de afbeelding die je ziet als iemand een link naar de
 * game deelt. Gebruikt de echte kaart uit de build (draai eerst npm run build).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const WORTEL = resolve(import.meta.dirname, '..');
const lokaal = '/opt/pw-browsers/chromium';
const letter = (pakket: string, bestand: string) =>
  readFileSync(resolve(WORTEL, 'node_modules/@fontsource', pakket, 'files', bestand)).toString(
    'base64',
  );

const server = await preview({ root: WORTEL, preview: { port: 4191, strictPort: true } });
const browser = await chromium.launch(existsSync(lokaal) ? { executablePath: lokaal } : {});
try {
  const page = await browser.newPage({
    viewport: { width: 620, height: 700 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('http://localhost:4191/');
  await page.locator('.kaart-gebouw').first().waitFor();
  await page.waitForTimeout(800);
  // Rechtstreeks uit het canvas: zonder knoppen en tekstballonnen erop.
  const kaart = await page.evaluate(
    () =>
      (document.querySelector('.kaart-doek canvas') as HTMLCanvasElement)
        .toDataURL('image/png')
        .split(',')[1],
  );

  // Een nieuwe, lege pagina: de CSP van de site geldt daar niet.
  const blad = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await blad.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Baloo; font-weight: 800; src: url(data:font/woff2;base64,${letter('baloo-2', 'baloo-2-latin-800-normal.woff2')}) format('woff2'); }
    @font-face { font-family: Asap; font-weight: 600; src: url(data:font/woff2;base64,${letter('asap', 'asap-latin-600-normal.woff2')}) format('woff2'); }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #1233c4; font-family: Asap, sans-serif; }
    .tekst { position: absolute; left: 64px; top: 0; bottom: 0; width: 560px; display: flex; flex-direction: column; justify-content: center; color: #fff; }
    .soort { font-family: Baloo; font-size: 30px; color: #ff6a00; margin: 0; }
    h1 { font-family: Baloo; font-size: 74px; line-height: 0.98; margin: 6px 0 22px; }
    p { font-size: 28px; line-height: 1.3; margin: 0; }
    .colofon { position: absolute; left: 64px; bottom: 40px; margin: 0; font-size: 20px; color: #fff; }
    .kaart { position: absolute; right: 0; top: 0; width: 600px; height: 630px; background: #dde9f7; }
    .kaart img { width: 100%; height: 100%; object-fit: cover; }
  </style></head><body>
    <div class="kaart"><img src="data:image/png;base64,${kaart}" alt=""></div>
    <div class="tekst">
      <p class="soort">Begrotingsgame</p>
      <h1>Maak de begroting van de gemeente Groningen</h1>
      <p>Waar bezuinig jij, en waar investeer je in? Speel met de echte begroting.</p>
    </div>
    <p class="colofon">Een initiatief van VVD Groningen</p>
  </body></html>`);
  await blad.evaluate(() => document.fonts.ready);
  await blad.screenshot({ path: resolve(WORTEL, 'public/og-afbeelding.png') });
  console.log('public/og-afbeelding.png gemaakt');
} finally {
  await browser.close();
  await new Promise<void>((r) => server.httpServer.close(() => r()));
}
