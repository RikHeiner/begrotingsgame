/**
 * Fase 8: de Content Security Policy van de productiebuild blokkeert niets wat de game nodig heeft.
 * Elke overtreding komt via het event securitypolicyviolation in een lijst.
 */
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

async function overtredingen(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('begrotingsgame:tutorial', 'klaar');
    localStorage.setItem('begrotingsgame:geluid', 'aan');
    const lijst: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = lijst;
    document.addEventListener('securitypolicyviolation', (e) =>
      lijst.push(`${e.violatedDirective}: ${e.blockedURI}`),
    );
  });
});

test('de CSP staat in de pagina en blokkeert niets in de game', async ({ page }) => {
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: { t1: -5 }, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("script-src 'self'");
  await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
  // Een keuze maken (geluid staat aan)
  await page
    .getByRole('button', { name: /Stadhuis/ })
    .first()
    .focus();
  await page.keyboard.press('Enter');
  const schuif = page.getByTestId('paneel').getByRole('slider', { name: /Overhead/ });
  await schuif.focus();
  await page.keyboard.press('ArrowLeft');
  await page.getByTestId('paneel').getByRole('button', { name: 'Paneel sluiten' }).click();
  // Wat betekent het voor mij
  await page.getByTestId('inwoners').click();
  await page.getByTestId('open-voor-mij').click();
  await page.keyboard.press('Escape');
  // Eindscherm, document, Word en afbeelding
  await page.getByTestId('indienen').click();
  await page.getByTestId('maak-tegenbegroting').click();
  const [word] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-word').click(),
  ]);
  expect(word.suggestedFilename()).toMatch(/\.docx$/);
  const [png] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-afbeelding').click(),
  ]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  // Campagne
  await page.getByRole('button', { name: '← Terug' }).click();
  await page.getByRole('button', { name: 'Terug naar de gemeente' }).click();
  await page.getByTestId('campagne').click();
  await page.getByTestId('start-campagne').click();
  await expect(page.getByTestId('gebeurtenissen')).toBeVisible();
  expect(await overtredingen(page)).toEqual([]);
});

test('de CSP blokkeert niets in het dashboard', async ({ page }) => {
  await page.goto('/dashboard.html');
  await expect(page.getByTestId('aantal')).toBeVisible();
  await expect(page.getByTestId('heatmap')).toBeVisible();
  expect(await overtredingen(page)).toEqual([]);
});
