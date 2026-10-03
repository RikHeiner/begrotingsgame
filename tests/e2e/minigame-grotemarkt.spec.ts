/** Minigame Grote Markt: "Marktkoopman". */
import { expect, test } from '@playwright/test';

test('Grote Markt: kraam vullen, klaar, overzicht en score', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="grotemarkt"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-grotemarkt');
  await expect(spel.getByRole('timer')).toContainText('seconden');
  await expect(spel.getByText(/Spelregel/)).toBeVisible();
  const kramen = spel.locator('.mg-markt-kraam');
  await expect(kramen).toHaveCount(12);
  await kramen.first().click();
  await expect(kramen.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(spel.getByRole('status').first()).toContainText('in je kraam gelegd');
  await spel.getByTestId('mg-markt-klaar').click();
  await expect(spel.getByTestId('mg-markt-overzicht')).toContainText('geeft de gemeente');
  await spel.getByTestId('mg-markt-score').click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 100');
});
