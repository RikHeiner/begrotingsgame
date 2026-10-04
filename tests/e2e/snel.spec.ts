/** Snel spelen: minder knoppen, cijfers en tekst. De uitleg zit achter één knop per gebouw. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('begrotingsgame:tutorial', 'klaar');
    localStorage.setItem('begrotingsgame:modus', 'snel');
  });
});

test('snel spelen: menu bovenin, uitleg ingeklapt, minigameknop linksboven', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  // Bovenin alleen het saldo, het menu en Indienen
  await expect(page.getByTestId('opslaan')).toBeHidden();
  await expect(page.getByTestId('indienen')).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByTestId('opslaan')).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  // Geen oranje Speel-labels op de kaart, wel de minigameknop linksboven
  await expect(page.locator('.kaart-minigame').first()).toBeHidden();
  await expect(page.getByTestId('minigame-knop')).toBeVisible();
  // In een gebouw: schuif en één regel; de rest achter "Meer uitleg"
  await page.getByTestId('route').getByRole('button', { name: 'Naar het belastingloket' }).click();
  const paneel = page.getByTestId('paneel');
  await expect(paneel.getByRole('slider', { name: /Onroerendezaakbelasting/ })).toBeVisible();
  await expect(paneel.getByTestId('gemiddelde-t1')).toBeHidden();
  await expect(paneel.locator('.schuif-bedrag').first()).toBeHidden();
  await paneel.getByRole('button', { name: /Meer uitleg/ }).click();
  await expect(paneel.getByTestId('gemiddelde-t1')).toBeVisible();
  await expect(paneel.locator('.schuif-bedrag').first()).toBeVisible();
});

test('op het startscherm kies je snel of uitgebreid', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('begrotingsgame:start'));
  await page.goto('/');
  const start = page.getByTestId('startscherm');
  await expect(start.getByTestId('begin')).toContainText('Snel spelen');
  await start.getByTestId('begin-uitgebreid').click();
  await expect(page.getByTestId('opslaan')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('begrotingsgame:modus'))).toBe(
    'uitgebreid',
  );
});
