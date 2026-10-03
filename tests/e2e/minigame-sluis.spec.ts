import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Oostersluis: acht rondes sluiswachter', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="sluis"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-sluis');
  for (let ronde = 1; ronde <= 8; ronde++) {
    await expect(spel).toContainText(`Ronde ${ronde} van 8`);
    await expect(spel.getByTestId('mg-sluis-peil')).toBeVisible();
    await spel.getByRole('button', { name: /Niets doen/ }).click();
    await spel.getByRole('button', { name: /Volgende ronde|Bekijk de uitslag/ }).click();
  }
  await expect(spel).toContainText('Een begroting moet in evenwicht zijn');
  await spel.getByRole('button', { name: 'Naar je score' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 100');
});
