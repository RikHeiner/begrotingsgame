/** Terugkomen op de site: verder met je eigen begroting, of opnieuw beginnen. */
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

async function zetOzbOpGemiddelde(page: Page) {
  await page.goto('/');
  await page.getByTestId('route').getByRole('button', { name: 'Naar het belastingloket' }).click();
  const paneel = page.getByTestId('paneel');
  await paneel
    .getByTestId('gemiddelde-t1')
    .getByRole('button', { name: /Zet op het gemiddelde van Nederland/ })
    .click();
  await paneel.getByTestId('volgende-stap').click();
  await expect(paneel).toContainText('Stap 2 van 14');
  await paneel.getByRole('button', { name: 'Paneel sluiten' }).click();
  // Even wachten tot de begroting is onthouden.
  await page.waitForTimeout(600);
  return (await page.getByTestId('saldo').textContent()) ?? '';
}

test('terugkomen: verder gaan met je eigen begroting', async ({ page }) => {
  const saldo = await zetOzbOpGemiddelde(page);
  await page.goto('/');
  const welkom = page.getByRole('dialog', { name: 'Welkom terug!' });
  await expect(welkom).toBeVisible();
  await expect(welkom).toContainText('stap 2 van 14');
  await welkom.getByRole('button', { name: 'Ga verder met je begroting' }).click();
  await expect(welkom).toHaveCount(0);
  await expect(page.getByTestId('saldo')).toHaveText(saldo);
  await expect(page.getByTestId('route')).toContainText('Stap 2 van 14');
});

test('terugkomen: opnieuw beginnen bij nul', async ({ page }) => {
  const saldo = await zetOzbOpGemiddelde(page);
  await page.goto('/');
  const welkom = page.getByRole('dialog', { name: 'Welkom terug!' });
  await welkom.getByRole('button', { name: 'Begin opnieuw' }).click();
  await expect(welkom).toHaveCount(0);
  await expect(page.getByTestId('saldo')).not.toHaveText(saldo);
  await expect(page.getByTestId('nul-melding')).toBeVisible();
  // Daarna is er niets meer om verder te gaan.
  await page.waitForTimeout(600);
  await page.goto('/');
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('welkom-terug')).toHaveCount(0);
});
