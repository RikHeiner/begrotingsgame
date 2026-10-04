import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test("Euroborg: penalty's schrappen of laten staan; de wet houdt alles tegen", async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="euroborg"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-euroborg');
  await spel.getByRole('button', { name: 'Start ronde 1' }).click();

  const stand = spel.getByTestId('mg-eb-stand');
  const penalty = spel.getByTestId('mg-penalty');
  const status = spel.locator('.mg-status');
  const veld = spel.getByRole('img');
  // Met minder beweging loopt er geen klok: je speelt in beurten.
  await expect(stand).toContainText('Penalty 1 van 4');
  await expect(stand).not.toContainText('Tijd');

  let wetGestopt = false;
  let wetGelaten = false;
  for (let ronde = 1; ronde <= 3; ronde++) {
    await expect(stand).toContainText(`Ronde ${ronde} van 3`);
    for (let i = 1; i <= 4; i++) {
      await expect(penalty).toContainText(`Penalty ${i} van 4`);
      await expect(penalty).toContainText('€');
      await expect(veld).toHaveAttribute('aria-label', /schrappen of laten staan/);
      // Ronde 1 en 3: schieten (ronde 3 met het toetsenbord). Ronde 2: laten staan.
      if (ronde === 2) {
        await spel.getByRole('button', { name: /Laten staan/ }).click();
      } else if (ronde === 1) {
        await spel.getByRole('button', { name: /Schrappen/ }).click();
        await spel.getByRole('button', { name: i % 2 ? /Links/ : /Rechts/ }).click();
      } else {
        await page.keyboard.press('s');
        await page.keyboard.press('ArrowUp');
      }
      const soort = penalty.locator('.mg-eb-soort');
      await expect(soort).toBeVisible();
      const wet = ((await soort.textContent()) ?? '').includes('Moet van de wet');
      if (ronde === 2) {
        await expect(status).toContainText(wet ? 'Goed gezien! +1 punt' : 'geen straf');
        if (wet) wetGelaten = true;
      } else if (wet) {
        await expect(status).toContainText('Gestopt! Dit moet van de wet (');
        await expect(status).toContainText('niet stoppen');
        wetGestopt = true;
      } else {
        await expect(status).toContainText(
          /Gescoord! De gemeente bespaart € .* mln|Gestopt door de keeper|Naast|Over de lat/,
        );
      }
      await spel
        .getByRole('button', { name: /Volgende penalty|Einde van de ronde|eindstand/ })
        .click();
    }
    if (ronde < 3) {
      const kaart = spel.getByTestId('mg-eb-ronde');
      await expect(kaart).toContainText(`Ronde ${ronde} klaar`);
      await expect(kaart).toContainText(/moet van de wet \(/);
      await expect(kaart).toContainText('eigen keuze');
      await kaart.getByRole('button', { name: `Ronde ${ronde + 1}`, exact: false }).click();
    }
  }
  expect(wetGestopt).toBe(true);
  expect(wetGelaten).toBe(true);

  const uitslag = spel.getByTestId('mg-eb-uitslag');
  await expect(uitslag).toContainText('van de 12 punten');
  await expect(uitslag).toContainText('Wat je leerde');
  await expect(uitslag).toContainText('de begroting 2027');
  await expect(uitslag).not.toContainText(/tegenbegroting/i);
  await expect(uitslag.locator('li')).toHaveCount(12);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 12');
});
