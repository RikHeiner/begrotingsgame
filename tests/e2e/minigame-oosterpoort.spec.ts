import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('De Oosterpoort: vier keer raden wie betaalt', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="oosterpoort"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-oosterpoort');
  await expect(spel.getByRole('heading', { name: 'Stadsschouwburg en Oosterpoort' })).toBeVisible();
  for (let ronde = 1; ronde <= 4; ronde++) {
    await expect(spel).toContainText(`Ronde ${ronde} van 4`);
    const schuif = spel.getByRole('slider', { name: /Bezoekers en gebruikers betalen/ });
    await schuif.focus();
    await page.keyboard.press('ArrowRight');
    await spel.getByRole('button', { name: 'Dit is mijn gok' }).click();
    await expect(spel.locator('div[role="status"]')).toContainText(
      'Van elke € 10 betalen bezoekers',
    );
    await spel.getByRole('button', { name: /Volgende voorstelling|^Klaar$/ }).click();
  }
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 100');
});
