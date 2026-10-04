import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Museum: moet het van de wet of kiest de gemeente? Twaalf kunstwerken in beurten', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="museum"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-museum');
  // Met minder beweging: geen klok en geen levels, maar twaalf kunstwerken.
  await spel.getByRole('button', { name: 'Start', exact: true }).click();
  const zaal = spel.getByTestId('mg-museum-zaal');
  const veld = spel.getByRole('img');
  const status = spel.locator('.mg-status');
  for (let i = 1; i <= 12; i++) {
    await expect(zaal).toContainText(`Kunstwerk ${i} van 12`);
    await expect(veld).toHaveAttribute(
      'aria-label',
      new RegExp(`Kunstwerk ${i} van 12: .+ in 2027`),
    );
    if (i % 3 === 0) {
      // ook met het toetsenbord
      await page.keyboard.press('ArrowRight');
    } else {
      await spel
        .getByRole('button', { name: i % 2 ? 'Moet van de wet' : 'Eigen keuze van de gemeente' })
        .click();
    }
    // Na elk antwoord: de uitleg en het bedrag uit de begroting, zonder oordeel over geld.
    await expect(status).toContainText(
      /(Moet van de .+\. De gemeente kiest wel hoeveel geld ze eraan uitgeeft\.|De gemeente kiest dit zelf\. Ze kan het ook laten\.)/,
    );
    await expect(status).toContainText('(begroting 2027)');
    await expect(status).not.toContainText(/levert .*op|kost geld|belasting/i);
  }
  const einde = spel.getByTestId('mg-museum-einde');
  await expect(einde).toContainText(/Klaar! \d+ van de 12 goed/);
  await einde.getByRole('button', { name: 'Bekijk je score' }).click();
  const uitslag = spel.getByTestId('mg-museum-uitslag');
  await expect(uitslag).toContainText(/Je score: \d+ van de \d+ punten/);
  const overzicht = uitslag.getByTestId('mg-museum-overzicht');
  await expect(overzicht).toContainText('Moet van de wet');
  await expect(overzicht).toContainText('Eigen keuze van de gemeente');
  await expect(overzicht).toContainText('Jeugdwet');
  await expect(uitslag).not.toContainText(/tegenbegroting|levert geld op/i);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
});
