import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// In de cloudomgeving staat Chromium al klaar; in CI installeert Playwright zijn eigen browser.
const lokaleChromium = '/opt/pw-browsers/chromium';
const launchOptions =
  !process.env.CI && existsSync(lokaleChromium) ? { executablePath: lokaleChromium } : {};

const POORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${POORT}`,
    trace: 'on-first-retry',
    // De camera vliegt naar een gebouw; met minder beweging gaat dat meteen, zodat een tik in een
    // test niet op een bewegende kaart valt.
    contextOptions: { reducedMotion: 'reduce' },
    launchOptions,
    // De tests beginnen in de gemeente, zonder startscherm. De game begint altijd bij nul; tests die
    // met de bedragen van het college rekenen, openen een gedeelde link (zie tests/e2e/hulp.ts).
    // tests/e2e/startscherm.spec.ts test het startscherm.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${POORT}`,
          localStorage: [{ name: 'begrotingsgame:start', value: 'gezien' }],
        },
      ],
    },
  },
  projects: [
    {
      name: 'mobiel-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobiel-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `VITE_OPSLAG=lokaal npm run build && npm run preview -- --port ${POORT} --strictPort`,
    url: `http://localhost:${POORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
