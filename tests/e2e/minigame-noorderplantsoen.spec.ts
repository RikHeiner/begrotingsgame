import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Noorderplantsoen: repareer wat kapot is en stop, dan de rekening', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="noorderplantsoen"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-noorderplantsoen');
  await expect(spel.getByTestId('mg-park-tijd')).toContainText('seconden');
  // Wacht tot er iets kapot gaat en repareer het.
  const kapot = spel.getByRole('button', { name: /Gat in het pad|Kapotte lantaarn/ }).first();
  await expect(kapot).toBeVisible({ timeout: 5000 });
  await kapot.click();
  await expect(spel.getByRole('status')).toContainText('Gerepareerd voor');
  await spel.getByRole('button', { name: 'Stoppen' }).click();
  const rekening = spel.getByRole('status');
  await expect(rekening).toContainText('Totaal');
  await expect(rekening).toContainText('extra');
  await expect(rekening).toContainText('mln');
  await rekening.getByRole('button', { name: 'Naar je score' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 100');
});
