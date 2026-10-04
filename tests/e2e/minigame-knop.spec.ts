/** Linksonder "Speel een minigame", en zien welke minigames je al speelde. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('begrotingsgame:tutorial', 'klaar');
    // Het museum is al gespeeld.
    localStorage.setItem('begrotingsgame:minigames', JSON.stringify({ museum: 6 }));
  });
});

test('de knop kiest een minigame die je nog niet speelde', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  const knop = page.getByTestId('minigame-knop');
  await expect(knop).toContainText('Speel een minigame');
  await expect(knop).toContainText('1 van 10 gespeeld');
  // Al gespeeld: een vinkje op de kaart.
  const museum = page.locator('[data-minigame="museum"]');
  await expect(museum).toHaveClass(/gespeeld/);
  await expect(museum).toHaveAccessibleName(/Al gespeeld/);
  await page.screenshot({ path: testInfo.outputPath('minigame-knop.png') });
  for (let i = 0; i < 5; i++) {
    await knop.click();
    const dialoog = page.getByRole('dialog');
    await expect(page.getByTestId('minigame-start')).toBeVisible();
    await expect(dialoog).not.toContainText('Groninger Museum');
    await dialoog.getByRole('button', { name: /Sluiten/ }).click();
  }
});
