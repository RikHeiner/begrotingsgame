/** Minigame Grote Markt: "Begrotingstetris" (rustige modus: in beurten, zonder klok). */
import { expect, test } from '@playwright/test';

test('Grote Markt: Begrotingstetris in beurten; schrappen mag alleen bij een eigen keuze', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="grotemarkt"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-grotemarkt');
  await expect(spel.getByText(/Moet van de wet|moet van de wet/).first()).toBeVisible();
  await spel.getByRole('button', { name: 'Start', exact: true }).click();

  // Met minder beweging valt er niets vanzelf en telt de tijd niet: je hebt 15 blokken.
  const stand = spel.getByTestId('mg-tetris-stand');
  await expect(stand).toContainText('Blok 1 van 15');
  await expect(stand).toContainText('Punten 0');
  const veld = spel.getByRole('img', { name: /Het bord/ });
  await expect(veld).toHaveAttribute('aria-label', /Vallend blok: .+ kolom \d+ tot \d+, 0 rijen/);

  // Het blok valt niet vanzelf; met ▼ en ↓ zakt het, en dat geeft een punt per vakje.
  await page.waitForTimeout(1200);
  await expect(veld).toHaveAttribute('aria-label', /, 0 rijen van boven/);
  await spel.getByRole('button', { name: 'Omlaag' }).click();
  await page.keyboard.press('ArrowDown');
  await expect(veld).toHaveAttribute('aria-label', /, 2 rijen van boven/);
  await expect(stand).toContainText('Punten 2');
  // tikken op het veld draait het blok; pijltjes schuiven het
  await veld.click();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');

  const status = spel.locator('.mg-status');
  let keuze = false;
  let wet = false;
  for (let i = 0; i < 20; i++) {
    if (await spel.getByTestId('mg-tetris-einde').isVisible()) break;
    const nu = spel.getByTestId('mg-tetris-nu');
    await expect(nu).toBeVisible();
    const soort = await nu.getAttribute('data-soort');
    if (soort === 'keuze' && !keuze) {
      await expect(nu).toContainText('Eigen keuze');
      await spel.getByRole('button', { name: /Schrappen/ }).click();
      await expect(status).toContainText('Bespaard');
      keuze = true;
      continue;
    }
    if (soort === 'wet' && !wet) {
      await expect(nu).toContainText('Moet van de wet (');
      await page.keyboard.press('s');
      await expect(status).toContainText('Moet van de wet');
      await expect(status).toContainText('kun je niet schrappen');
      wet = true;
      continue;
    }
    // om en om links, rechts en in het midden neerleggen
    const kant = i % 3 === 0 ? 'Naar links' : i % 3 === 1 ? 'Naar rechts' : undefined;
    if (kant) for (let k = 0; k < 4; k++) await spel.getByRole('button', { name: kant }).click();
    await spel.getByRole('button', { name: 'Laten vallen' }).click();
  }
  expect(keuze && wet).toBe(true);

  const einde = spel.getByTestId('mg-tetris-einde');
  await expect(einde).toContainText(/Alle blokken zijn geweest|De begroting loopt over/);
  await expect(einde).toContainText(/Je haalde \d+ punten/);
  await expect(einde.getByTestId('mg-tetris-geschrapt')).toContainText('mln');
  await expect(einde.getByTestId('mg-tetris-wet')).toContainText('moet van de');
  await expect(einde).toContainText('de begroting 2027');
  await expect(einde).not.toContainText(/tegenbegroting/i);
  await einde.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 1000');
});
