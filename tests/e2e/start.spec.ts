import { expect, test } from '@playwright/test';

test('de debugpagina laadt het actieve begrotingsjaar uit de data', async ({ page }) => {
  await page.goto('/#debug');
  await expect(page.getByTestId('actief-jaar')).toContainText('Begroting 2026');
  await expect(page.getByTestId('actief-jaar')).toContainText('2026 t/m 2029');
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
