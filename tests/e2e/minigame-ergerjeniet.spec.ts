/** Minigame Academiegebouw: "Groninger erger je niet" (rustige modus: het college gooit met een knop). */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Groninger erger je niet: gooien, ergerniskaarten met bron, stoppen en de uitslag', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="ergerjeniet"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-ergerjeniet');
  await spel.getByRole('button', { name: 'Start het spel' }).click();
  await expect(spel.getByTestId('mg-erger-beurt')).toContainText('Jouw beurt');

  let kaarten = 0;
  for (let i = 0; i < 40 && kaarten < 1; i++) {
    const kaart = spel.getByTestId('mg-erger-kaart');
    if (await kaart.isVisible()) {
      kaarten++;
      await expect(kaart.getByRole('link')).toHaveAttribute(
        'href',
        /^https:\/\/(www\.)?(oogtv|rtvnoord)\.nl\//,
      );
      await kaart.getByRole('button', { name: 'Verder' }).click();
      continue;
    }
    if (await spel.getByTestId('mg-erger-uitslag').isVisible()) break;
    const pion = spel.getByRole('button', { name: /^Pion 1/ });
    const gooi = spel.getByTestId('mg-erger-gooi');
    const college = spel.getByTestId('mg-erger-college');
    if (await pion.isVisible()) await pion.click({ timeout: 2000 }).catch(() => undefined);
    else if (
      (await gooi.isVisible()) &&
      (await gooi.isEnabled({ timeout: 500 }).catch(() => false))
    )
      await gooi.click({ timeout: 2000 }).catch(() => undefined);
    else if (await college.isVisible())
      await college.click({ timeout: 2000 }).catch(() => undefined);
  }
  if (await spel.getByTestId('mg-erger-uitslag').isHidden())
    await spel.getByRole('button', { name: 'Stoppen' }).click();
  const uitslag = spel.getByTestId('mg-erger-uitslag');
  await expect(uitslag).toContainText('ergernis');
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  await expect(page.getByTestId('minigame-klaar')).toContainText('van de 100');
});
