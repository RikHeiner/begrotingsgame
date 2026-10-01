/** Fase 6: de campagnemodus, vier rondes met gebeurteniskaarten. */
import { expect, test } from '@playwright/test';

test('campagne: vier rondes, kaarten per ronde en een eindscore over de hele periode', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await page.getByTestId('campagne').click();
  await page.getByTestId('start-campagne').click();

  for (const [ronde, jaar] of [
    [1, 2026],
    [2, 2027],
    [3, 2028],
    [4, 2029],
  ] as const) {
    const d = page.getByRole('dialog', { name: `Ronde ${ronde} van 4: ${jaar}` });
    await expect(d).toBeVisible();
    await expect(d.locator('.gebeurtenis').first()).toBeVisible();
    const aantal = await d.locator('.gebeurtenis').count();
    expect(aantal).toBeGreaterThanOrEqual(1);
    expect(aantal).toBeLessThanOrEqual(2);
    await expect(d).toContainText('scenario, geen voorspelling');
    if (ronde === 1) await page.screenshot({ path: testInfo.outputPath('ronde-1.png') });
    await d.getByRole('button', { name: 'Aan de slag' }).click();
    await expect(page.getByTestId('ronde')).toHaveText(`Ronde ${ronde}/4 · ${jaar}`);
    await expect(page.getByTestId('saldo')).toContainText(`(${jaar})`);
    if (ronde < 4) await page.getByTestId('volgende-ronde').click();
  }
  await page.screenshot({ path: testInfo.outputPath('ronde-4.png') });
  await page.getByTestId('indienen').click();
  const overzicht = page.getByTestId('campagne-overzicht');
  await expect(overzicht).toBeVisible();
  await expect(overzicht.locator('tbody tr')).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath('campagne-eind.png'), fullPage: true });
});
