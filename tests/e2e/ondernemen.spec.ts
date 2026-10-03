/** Bij ondernemen: het juiste gevolg per post, een knopje "Wat is dit?" en minder bouwregels. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('ondernemen: gevolgen die passen bij de post, met uitleg', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-gebouw="winkel"]').focus();
  await page.keyboard.press('Enter');
  const paneel = page.getByTestId('paneel');
  // Het Akkoord van Groningen gaat over onderwijs, de Suikerzijde over bouwen.
  await expect(paneel.getByTestId('gevolg-e4')).toContainText('scholen');
  await expect(paneel.getByTestId('gevolg-e8')).toContainText('woningen bouwen');
  await expect(paneel.getByTestId('gevolg-e7')).toContainText('panden en grond');
  await expect(paneel.getByTestId('gevolg-e9')).toContainText('regio');
  await expect(paneel.getByTestId('gevolg-e6')).toContainText('ondernemers');
  const info = paneel.getByTestId('info-e9');
  await info.getByText('Wat is dit?').click();
  await expect(info).toContainText('provincies Groningen en Drenthe');
});

test('Beleidshuis: minder bouwregels kost niets en levert later OZB op', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-gebouw="beleid"]').focus();
  await page.keyboard.press('Enter');
  const kaart = page.getByTestId('paneel').locator('[data-post="k_minder_bouwregels"] button');
  await expect(kaart).toContainText('Kost niets');
  await kaart.click();
  await expect(kaart).toHaveAttribute('aria-pressed', 'true');
});
