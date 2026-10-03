import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Academiegebouw: rondkomen als student, met sparen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="academie"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-academie');
  await expect(spel).toContainText('Afvalstoffenheffing van de gemeente');
  await expect(spel.getByTestId('mg-student-saldo')).toContainText('Je spaart nog niets');
  await spel.getByRole('button', { name: 'Sparen: € 10 meer' }).click();
  await expect(spel.getByTestId('mg-student-saldo')).toContainText('En je spaart');
  await spel.getByRole('button', { name: 'Klaar', exact: true }).click();
  const klaar = page.getByTestId('minigame-klaar');
  await expect(klaar).toBeVisible();
  await expect(klaar).toContainText('100 van de 100');
});
