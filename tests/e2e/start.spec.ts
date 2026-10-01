import { expect, test } from '@playwright/test';

test('de pagina laadt het actieve begrotingsjaar uit de data', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Maak de begroting van de gemeente Groningen',
  );
  await expect(page.getByTestId('actief-jaar')).toHaveText('Begroting 2026');
  await page.screenshot({ path: testInfo.outputPath('start.png'), fullPage: true });
});

test('het databestand wordt los van de code geserveerd', async ({ request }) => {
  const antwoord = await request.get('/data/config.json');
  expect(antwoord.ok()).toBe(true);
  expect(await antwoord.json()).toMatchObject({ actiefJaar: 2026 });
  // Documentatie in data/ hoort niet online te staan.
  const md = await request.get('/data/SCHEMA.md');
  expect(md.headers()['content-type'] ?? '').not.toContain('json');
});
