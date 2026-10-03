/** Minigame Hoofdstation: "Op tijd vertrekken". */
import { expect, test } from '@playwright/test';

test('Station: acht treinen op een spoor zetten', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="station"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-station');
  for (let i = 0; i < 8; i++) {
    await expect(spel.getByTestId('mg-station-voortgang')).toContainText(`Trein ${i + 1} van 8`);
    await spel.locator(`[data-spoor="${i % 2 ? 'I' : 'S'}"]`).click();
    await expect(spel.getByRole('status')).toContainText('Het goede spoor is');
    await spel.getByTestId('mg-station-volgende').click();
  }
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 8');
});
