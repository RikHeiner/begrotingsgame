import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Geldzoeker: uit het tekort graven, met levels; goud met bron en jaar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="goudkantoor"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-goudkantoor');
  await spel.getByRole('button', { name: 'Start level 1' }).click();
  const stand = spel.getByTestId('mg-goud-stand');
  await expect(stand).toContainText('Level 1');
  // Met minder beweging telt de tijd niet: je hebt beurten en richt zelf.
  await expect(stand).toContainText('Beurten 9');
  await expect(stand).toContainText('−');
  // Helemaal naar links richten, dan steeds een stukje naar rechts en graven.
  for (let i = 0; i < 12; i++) await spel.getByRole('button', { name: /Richt links/ }).click();
  let goud = false;
  for (let beurt = 0; beurt < 9; beurt++) {
    if (await spel.getByTestId('mg-goud-einde').isVisible()) break;
    await spel.getByRole('button', { name: /Graaf/ }).click();
    const status = spel.locator('div[role="status"]');
    if (((await status.textContent()) ?? '').includes('💰')) {
      goud = true;
      await expect(status).toContainText(/begroting 2027|tegenbegroting VVD 2026/);
    }
    for (let i = 0; i < 3; i++) {
      const rechts = spel.getByRole('button', { name: /Richt rechts/ });
      if ((await rechts.count()) && (await rechts.isEnabled())) await rechts.click();
    }
  }
  expect(goud).toBe(true);
  const einde = spel.getByTestId('mg-goud-einde');
  await expect(einde).toContainText(/Level 1 gehaald|nog een tekort/);
  await einde.getByRole('button', { name: /Stoppen|Bekijk/ }).click();
  const uitslag = spel.getByTestId('mg-goud-uitslag');
  await expect(uitslag).toContainText('levels');
  await expect(uitslag).toContainText('Tegenbegroting VVD Groningen 2026');
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
});
