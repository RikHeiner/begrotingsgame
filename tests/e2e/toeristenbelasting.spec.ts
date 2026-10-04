/** Belastingloket: de toeristenbelasting per persoon per nacht, met het gemiddelde van Nederland. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('toeristenbelasting: gemiddeld tarief per nacht in Nederland, en erop zetten', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('route').getByRole('button', { name: 'Naar het belastingloket' }).click();
  const paneel = page.getByTestId('paneel');
  const gem = paneel.getByTestId('gemiddelde-toerist');
  await expect(gem).toContainText('€ 2,79 per persoon per nacht');
  await expect(gem).toContainText('2026');
  await expect(paneel).not.toContainText('€ 88 per inwoner');
  await gem.getByRole('button', { name: 'Zet op het gemiddelde van Nederland' }).click();
  const schuif = paneel.getByRole('slider', { name: /Toeristenbelasting/ });
  await expect(paneel.locator(`output[for="${await schuif.getAttribute('id')}"]`)).toHaveText(
    '€ 2,79 per nacht',
  );
});
