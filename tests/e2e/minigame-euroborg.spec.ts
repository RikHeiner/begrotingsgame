import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test("Euroborg: acht penalty's, met uitleg na elk schot", async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="euroborg"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-euroborg');
  for (let i = 1; i <= 8; i++) {
    await expect(spel.getByTestId('mg-penalty')).toContainText(`Penalty ${i} van 8`);
    await spel.getByRole('button', { name: /Gaat erin/ }).click();
    const status = spel.getByRole('status');
    await expect(status).toContainText(/Goed voorspeld|verkeerd voorspeld/);
    await expect(status).toContainText('€');
    await status
      .getByRole('button', { name: i < 8 ? 'Volgende penalty' : 'Naar de uitslag' })
      .click();
  }
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 8');
});
