/** Minigame Forum: "Schatten op het dakterras". */
import { expect, test } from '@playwright/test';

test('Forum: vijf keer schatten met de schuif', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="forum"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-forum');
  for (let i = 0; i < 5; i++) {
    await expect(spel.getByTestId('mg-forum-voortgang')).toContainText(`Ronde ${i + 1} van 5`);
    const schuif = spel.getByRole('slider', { name: /Jouw gok/ });
    const voor = await schuif.getAttribute('aria-valuetext');
    await schuif.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(schuif).not.toHaveAttribute('aria-valuetext', voor ?? '');
    await spel.getByTestId('mg-forum-raad').click();
    await expect(spel.getByRole('status')).toContainText('per inwoner');
    await spel.getByTestId('mg-forum-volgende').click();
  }
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 100');
});
