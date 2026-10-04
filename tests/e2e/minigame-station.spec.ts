/** Minigame Hoofdstation: "Ontwijk de onnodige uitgaven" (rustige modus, in beurten). */
import { expect, test } from '@playwright/test';

test('Station: fietsen naar de Grote Markt en de onnodige uitgaven ontwijken', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="station"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-station');
  await expect(spel.getByTestId('mg-race-start')).toContainText('volgens VVD Groningen niet nodig');
  await spel.getByRole('button', { name: 'Start de rit' }).click();

  const stand = spel.getByTestId('mg-race-stand');
  const veld = spel.locator('canvas');
  await expect(stand).toContainText('Beurt 1 van 20');
  await expect(veld).toHaveAttribute('aria-label', /Fietspad met drie stroken/);

  // Elke beurt: kijk welke strook vrij is en kies die (eerst munten), anders blijf je.
  let geraakt = false;
  for (let beurt = 0; beurt < 20; beurt++) {
    if (await spel.getByTestId('mg-race-uitslag').isVisible()) break;
    const rij = (await veld.getAttribute('data-rij')) ?? '...';
    const baan = Number(await veld.getAttribute('data-baan'));
    const kan = [baan - 1, baan, baan + 1].filter((b) => b >= 0 && b <= 2 && rij[b] !== 'U');
    const doel = kan.find((b) => rij[b] === 'M' || rij[b] === 'Z' || rij[b] === 'K') ?? kan[0];
    if (doel === undefined) geraakt = true;
    const keuze = doel === undefined || doel === baan ? 'Blijf' : doel < baan ? 'links' : 'rechts';
    // afwisselend met knoppen en met het toetsenbord
    if (beurt % 2) {
      await spel.getByRole('button', { name: new RegExp(keuze, 'i') }).click();
    } else {
      await veld.focus();
      await page.keyboard.press(
        keuze === 'links' ? 'ArrowLeft' : keuze === 'rechts' ? 'ArrowRight' : 'ArrowUp',
      );
    }
    // na de laatste beurt komt de eindkaart
    if (beurt < 19) await expect(spel.locator('.mg-status')).not.toBeEmpty();
  }

  const uitslag = spel.getByTestId('mg-race-uitslag');
  await expect(uitslag).toContainText('Je bent bij de Grote Markt');
  if (!geraakt) await expect(uitslag).toContainText('3 van de 3 levens over');
  await expect(uitslag).toContainText('Ontweken');
  await expect(uitslag).toContainText(/elk jaar|eenmalig/);
  await expect(uitslag).toContainText('begroting 2027');
  await expect(uitslag).toContainText('Volgens VVD Groningen');
  await expect(uitslag).not.toContainText(/tegenbegroting/i);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
});

test('Station: geraakt kost een leven en zegt wat het kost', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="station"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-station');
  await spel.getByRole('button', { name: 'Start de rit' }).click();
  const veld = spel.locator('canvas');
  // Rij recht op een uitgave af, tot je er een raakt.
  for (let beurt = 0; beurt < 20; beurt++) {
    const rij = (await veld.getAttribute('data-rij')) ?? '...';
    const baan = Number(await veld.getAttribute('data-baan'));
    const doel = [baan - 1, baan, baan + 1].find((b) => b >= 0 && b <= 2 && rij[b] === 'U');
    if (doel === undefined) {
      await spel.getByRole('button', { name: /Blijf/ }).click();
      continue;
    }
    const keuze = doel === baan ? /Blijf/ : doel < baan ? /links/ : /rechts/;
    await spel.getByRole('button', { name: keuze }).click();
    await expect(spel.locator('.mg-status')).toContainText(/Geraakt: .+, kost € /);
    await expect(spel.getByTestId('mg-race-levens')).toContainText('♥');
    await expect(spel.getByTestId('mg-race-levens').locator('[aria-label]')).toHaveAttribute(
      'aria-label',
      '2 van de 3',
    );
    return;
  }
  throw new Error('geen uitgave tegengekomen');
});
