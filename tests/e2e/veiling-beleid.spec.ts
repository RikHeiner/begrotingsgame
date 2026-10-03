/** Het Veilinghuis (verkopen), het Beleidshuis (aan of uit, en waarom) en het eindscherm. */
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

const open = async (page: Page, id: string) => {
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator(`[data-gebouw="${id}"]`).focus();
  await page.keyboard.press('Enter');
  return page.getByTestId('paneel');
};

test('Veilinghuis: bezit verkopen; alleen boekwinst is eenmalig vrij geld', async ({ page }) => {
  await page.goto('/');
  const paneel = await open(page, 'veiling');
  await expect(paneel).toContainText('boekwinst');
  const enexis = paneel.locator('[data-post="k_verkoop_enexis"] button');
  await expect(enexis).toContainText('Nu van de gemeente');
  await expect(enexis).toContainText('Eenmalig vrij geld (boekwinst): + € 50,00 mln');
  const ws = paneel.locator('[data-post="k_verkoop_warmtestad"] button');
  await expect(ws).toContainText('Elk jaar daarna: + € 0,95 mln');
  const eenmalig = await page.getByTestId('eenmalig').textContent();
  await enexis.click();
  await expect(enexis).toContainText('Je verkoopt dit');
  await expect(page.getByTestId('eenmalig')).not.toHaveText(eenmalig ?? '');
});

test('Beleidshuis: bij elke kaart staat of hij loopt, waarom, en wat een tik doet', async ({
  page,
}) => {
  await page.goto('/');
  const paneel = await open(page, 'beleid');
  await expect(paneel).toContainText('Dit doet de gemeente nu al.');
  const groen = page.getByTestId('programma-p_vitamine_g');
  await expect(groen).toContainText('✅ Loopt');
  // De titel is het programma zelf, niet "… stoppen": dan is "Loopt" niet verwarrend.
  await expect(groen.locator('strong')).toHaveText('Groenplan Vitamine G');
  await expect(groen).toContainText('Zonder dit programma:');
  await expect(page.getByTestId('waarom-p_vitamine_g')).toContainText(
    'Zo doet de gemeente het nu. Stopzetten scheelt',
  );
  await expect(groen).toContainText('Tik om stop te zetten');
  await groen.click();
  await expect(groen).toContainText('⏸ Gestopt');
  await expect(page.getByTestId('waarom-p_vitamine_g')).toContainText('Je hebt dit stopgezet');
  await expect(page.getByTestId('waarom-p_preventiefonds_jeugd')).toContainText(
    'staat bij nul stil',
  );
  await expect(paneel).toContainText(
    'Dit doet de gemeente nu nog niet; daarom staan de plannen uit.',
  );
});

test('indienen: geen "Wat betekent het voor mij?" op het eindscherm', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('indienen').click();
  const eind = page.getByTestId('eindscherm');
  await expect(eind).toBeVisible();
  await expect(eind.getByRole('button', { name: /Wat betekent het voor mij/ })).toHaveCount(0);
});
