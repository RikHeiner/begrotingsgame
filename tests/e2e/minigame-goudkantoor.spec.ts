import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Goudkantoor: richten en graven; goud met een zin uit het VVD-programma', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="goudkantoor"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-goudkantoor');
  await expect(spel.getByTestId('mg-goud-stand')).toContainText('Beurt 1 van 7');
  // Met minder beweging staat de grijper stil: helemaal naar links richten, dan steeds een stukje
  // naar rechts en graven. Zo kom je alle richtingen langs.
  for (let i = 0; i < 11; i++) await spel.getByRole('button', { name: /Richt links/ }).click();
  let goud = false;
  for (let beurt = 1; beurt <= 7; beurt++) {
    await spel.getByRole('button', { name: /Graaf/ }).click();
    const status = spel.locator('div[role="status"]');
    await expect(status).toContainText(/Goud|steen|Niets geraakt/);
    if ((await status.textContent())?.includes('Goud:')) {
      goud = true;
      await expect(status).toContainText('Verkiezingsprogramma VVD Groningen 2026-2030, p.');
      await expect(status).toContainText('eenmalig in de begroting 2027');
    }
    const knop = status.getByRole('button');
    if ((await knop.textContent())?.includes('Wat heb ik gevonden')) {
      await knop.click();
      break;
    }
    await knop.click();
    for (let i = 0; i < 3; i++) await spel.getByRole('button', { name: /Richt rechts/ }).click();
  }
  expect(goud).toBe(true);
  await expect(spel.getByTestId('mg-goud-uitslag')).toContainText('wil schrappen');
  await spel.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
});
