import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Martinitoren: hoger of lager met begrijpelijke posten, klimmen tot de eindkaart', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="martinitoren"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-martinitoren');
  await spel.getByRole('button', { name: 'Start de klim' }).click();

  const stand = spel.getByTestId('mt-stand');
  await expect(stand).toContainText('Vraag 1 van 10');
  // Met minder beweging loopt er geen tijd.
  await expect(stand).toContainText('rustig');
  await expect(spel.getByRole('img', { name: /Martinitoren, 97 meter/ })).toBeVisible();

  const links = spel.getByTestId('mt-keuze-links');
  const rechts = spel.getByTestId('mt-keuze-rechts');
  for (let vraag = 1; vraag <= 10; vraag++) {
    if (await spel.getByTestId('mt-einde').isVisible()) break;
    await expect(stand).toContainText(`Vraag ${vraag} van 10`);
    // elke post heeft een uitleg; de bedragen zie je pas na je keuze
    await expect(links.locator('.mt-uitleg')).not.toBeEmpty();
    await expect(links).not.toContainText('per inwoner');
    // om en om met de muis en met het toetsenbord
    if (vraag % 2) await links.click();
    else await page.keyboard.press('ArrowRight');
    await expect(links).toContainText('per inwoner');
    await expect(rechts).toContainText('per inwoner');
    await expect(links).toContainText('mln');
    await expect(spel.locator('.mg-status')).toContainText(/meter/);
    await expect(spel.locator('.mg-status')).toContainText(/keer zoveel/);
    await spel.getByRole('button', { name: /Volgende vraag|Bekijk je klim|Naar de top/ }).click();
  }

  const einde = spel.getByTestId('mt-einde');
  await expect(einde).toContainText(/meter/);
  await expect(einde).toContainText('Wat je leerde');
  await expect(einde).toContainText('de begroting 2027');
  await expect(einde).not.toContainText(/tegenbegroting/i);
  expect(await einde.getByTestId('mt-paren').locator('li').count()).toBeGreaterThanOrEqual(8);
  await einde.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 97');
});
