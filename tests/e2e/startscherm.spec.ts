/** Het startscherm met uitleg: bij het eerste bezoek, niet bij een gedeelde link. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

// Zonder opgeslagen gegevens, zoals bij een eerste bezoek.
test.use({ storageState: { cookies: [], origins: [] } });

test('eerste bezoek: uitleg, dan de gemeente; daarna niet meer', async ({ page }, testInfo) => {
  await page.goto('/');
  const start = page.getByTestId('startscherm');
  await expect(start).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Jij bent gemeenteraadslid' })).toBeVisible();
  await expect(start).toContainText('€ 1.482 miljoen');
  await expect(start).toContainText('Wie betaalt meer, wie minder?');
  await expect(start).toContainText('Wat kan minder, of later?');
  await page.screenshot({ path: testInfo.outputPath('startscherm.png'), fullPage: true });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  // De gemeente staat er al achter.
  await expect(page.getByTestId('saldo')).toBeAttached();
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('saldo')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);

  // Opnieuw te openen via Instellingen
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByTestId('uitleg').click();
  await expect(page.getByTestId('startscherm')).toBeVisible();
  // Escape sluit de pop-up ook.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
});

test('een gedeelde link opent direct de begroting', async ({ page }) => {
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: {}, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
});
