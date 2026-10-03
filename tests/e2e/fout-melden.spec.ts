/** Overal de waarschuwing: er kan een fout in zitten, meld het, geen rechten aan te ontlenen. */
import { expect, test } from '@playwright/test';

// Een eerste bezoek: dan komt het startscherm.
test.use({ storageState: { cookies: [], origins: [] } });

test('waarschuwing op het startscherm, bij een minigame en op het eindscherm', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('startscherm').getByTestId('fout-melden')).toContainText(
    'geen rechten ontlenen',
  );
  await page.getByTestId('begin').click();
  await page.locator('[data-minigame="museum"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('fout-melden')).toContainText('Zie je een fout?');
  // Melden gaat per e-mail naar de fractie.
  await expect(
    page.getByTestId('fout-melden').getByRole('link', { name: /Meld het ons/ }),
  ).toHaveAttribute(
    'href',
    /^mailto:vvdgroningenstad@gmail\.com\?subject=Fout%20in%20de%20Begrotingsgame/,
  );
  await page.keyboard.press('Escape');
  await page.getByTestId('indienen').click();
  await expect(page.getByTestId('eindscherm').getByTestId('fout-melden')).toBeVisible();
});
