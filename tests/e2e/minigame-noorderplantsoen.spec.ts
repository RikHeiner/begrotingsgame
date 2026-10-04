import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Noorderplantsoen: parkploeg in dagen, repareren, rekening en het echte bedrag', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="noorderplantsoen"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-noorderplantsoen');
  await expect(spel).toContainText('spelregels');
  await spel.getByRole('button', { name: 'Start level 1' }).click();

  // Met minder beweging loopt er geen klok: je speelt in dagen.
  const stand = spel.getByTestId('mg-park-stand');
  await expect(stand).toContainText('Dag');
  await expect(stand).toContainText('1 van 10');
  await expect(stand).toContainText('Budget over');
  const veld = spel.getByRole('img', { name: /Noorderplantsoen/ });
  await expect(veld).toHaveAttribute('aria-label', /Kapot: 1: /);

  // De eerste klus: snel gerepareerd voor € 1.000.
  const klus = spel.getByRole('button', { name: /^Repareer: .*nog nieuw/ }).first();
  await klus.click();
  const status = spel.locator('div[role="status"]').last();
  await expect(status).toContainText('Gerepareerd');
  await expect(status).toContainText('€ 1.000');
  await expect(spel.getByTestId('mg-park-klussen')).toContainText('1 van 2');

  // Elke dag twee klussen, dan de volgende dag, tot het level klaar is.
  const einde = spel.getByTestId('mg-park-einde');
  for (let d = 0; d < 12; d++) {
    if (await einde.isVisible()) break;
    for (let k = 0; k < 2; k++) {
      const knop = spel.getByRole('button', { name: /^Repareer:/ }).first();
      if ((await knop.count()) && (await knop.isEnabled())) await knop.click();
    }
    await spel.getByRole('button', { name: /Volgende dag|Einde van het level/ }).click();
  }
  await expect(einde).toBeVisible();
  await expect(einde).toContainText('Snel gerepareerd');
  await expect(einde).toContainText('budget');
  await einde.getByRole('button', { name: 'Stoppen' }).click();

  const uitslag = spel.getByTestId('mg-park-uitslag');
  await expect(uitslag).toContainText('sterren');
  await expect(uitslag).toContainText('Level 1');
  await expect(uitslag).toContainText('in 2027');
  await expect(uitslag).toContainText('mln');
  await expect(uitslag).toContainText('Moet van de wet');
  await expect(uitslag).toContainText('spelregels');
  await expect(uitslag).not.toContainText(/tegenbegroting/i);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toBeVisible();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 9');
});
