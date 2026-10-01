import { expect, test } from '@playwright/test';

test('de pagina laadt het actieve begrotingsjaar uit de data', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Maak de begroting van de gemeente Groningen',
  );
  await expect(page.getByTestId('actief-jaar')).toContainText('Begroting 2026');
  await expect(page.getByTestId('actief-jaar')).toContainText('2026 t/m 2029');
  await page.screenshot({ path: testInfo.outputPath('start.png'), fullPage: false });
});

test('het databestand wordt los van de code geserveerd', async ({ request }) => {
  const antwoord = await request.get('/data/config.json');
  expect(antwoord.ok()).toBe(true);
  expect(await antwoord.json()).toMatchObject({ actiefJaar: 2026 });
  const spel = await request.get('/data/spel/gebouwen.json');
  expect(spel.ok()).toBe(true);
  // Documentatie in data/ hoort niet online te staan.
  const md = await request.get('/data/BEVINDINGEN.md');
  expect(md.headers()['content-type'] ?? '').not.toContain('json');
});
