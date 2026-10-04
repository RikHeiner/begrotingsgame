import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Oostersluis: schepen door de sluis, het peil binnen de band', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="sluis"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-sluis');
  await spel.getByRole('button', { name: 'Start level 1' }).click();

  const stand = spel.getByTestId('mg-sluis-stand');
  await expect(stand).toContainText('Level 1');
  // Met minder beweging loopt er geen klok: er ligt steeds één schip in de sluis.
  await expect(stand).toContainText('Schip 1 van 8');
  await expect(spel.getByRole('img', { name: /Oostersluis.*In de sluis ligt/ })).toBeVisible();
  const status = spel.locator('div[role="status"]');
  await expect(status).toContainText(/mln.*van € .* mln voor/);

  // Bezuinigen kan op een eigen keuze; op wat moet van de wet niet.
  await spel.getByRole('button', { name: /Bezuinigen/ }).click();
  await spel
    .getByRole('button', { name: /moet van de wet/i })
    .first()
    .click();
  await expect(status).toContainText('moet van de wet');
  await spel.getByRole('button', { name: /Sporthallen/ }).click();
  await expect(status).toContainText('Bezuinigd op Sporthallen');
  await spel.getByRole('button', { name: /OZB omhoog/ }).click();
  await expect(status).toContainText('duurder voor inwoners');

  // Speel het level uit: houd het peil in de buurt van 0.
  const peil = async () => Number(await spel.locator('[data-peil]').getAttribute('data-peil'));
  for (let beurt = 0; beurt < 12; beurt++) {
    if (await spel.getByTestId('mg-sluis-einde').isVisible()) break;
    const p = await peil();
    if (p > 3) await spel.getByRole('button', { name: /OZB omlaag/ }).click();
    else if (p < -3) {
      const reserve = spel.getByRole('button', { name: /Uit de reserve/ });
      if (await reserve.isEnabled()) await reserve.click();
      else {
        const ozb = spel.getByRole('button', { name: /OZB omhoog/ });
        if (await ozb.isEnabled()) await ozb.click();
      }
    }
    await spel.getByRole('button', { name: /Laat het schip door/ }).click();
  }
  const einde = spel.getByTestId('mg-sluis-einde');
  await expect(einde).toContainText(/Level 1/);
  await expect(einde).toContainText(/van de 8 schepen gingen veilig/);
  await einde
    .getByRole('button', { name: /Stoppen|Bekijk|Probeer/ })
    .last()
    .click();

  const uitslag = spel.getByTestId('mg-sluis-uitslag');
  await expect(uitslag).toContainText('keer veilig');
  await expect(uitslag).toContainText('Sporthallen');
  await expect(uitslag).toContainText('de begroting 2027');
  await expect(uitslag).not.toContainText(/tegenbegroting/i);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
});
