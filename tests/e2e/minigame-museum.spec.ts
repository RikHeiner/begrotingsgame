import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Museum: tien kunstwerken, moet of mag?', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="museum"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-museum');
  for (let i = 1; i <= 10; i++) {
    await expect(spel.getByTestId('mg-zaal')).toContainText(`Kunstwerk ${i} van 10`);
    await spel.getByRole('button', { name: 'Verplicht van de wet' }).click();
    const status = spel.getByRole('status');
    await expect(status).toContainText('Het goede antwoord is');
    await status
      .getByRole('button', { name: i < 10 ? 'Volgend kunstwerk' : 'Naar de uitslag' })
      .click();
  }
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 10');
});
