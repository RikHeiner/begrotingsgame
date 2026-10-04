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
  await expect(paneel).toContainText('Bovenaan de keuzes die VVD Groningen belangrijk vindt');
});

test('indienen: geen "Wat betekent het voor mij?" op het eindscherm', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('indienen').click();
  const eind = page.getByTestId('eindscherm');
  await expect(eind).toBeVisible();
  await expect(eind.getByRole('button', { name: /Wat betekent het voor mij/ })).toHaveCount(0);
});

test('zelf iets inbrengen in het Beleidshuis en het Veilinghuis, met een eigen bedrag', async ({
  page,
}) => {
  await page.goto('/');
  let paneel = await open(page, 'beleid');
  const beleid = paneel.getByTestId('eigen-beleid');
  const voor = await page.getByTestId('saldo').textContent();
  await beleid
    .getByLabel('Wat hoeft de gemeente niet meer te doen?')
    .fill('Stoppen met het magazine');
  await beleid.getByLabel(/Dat scheelt/).fill('0,4');
  await beleid.getByRole('button', { name: 'Voeg toe' }).click();
  await expect(beleid).toContainText('Stoppen met het magazine');
  await expect(beleid).toContainText('eigen schatting');
  await expect(page.getByTestId('saldo')).not.toHaveText(voor ?? '');
  // Zonder bedrag kan niet.
  await beleid.getByLabel('Wat hoeft de gemeente niet meer te doen?').fill('Iets anders');
  await beleid.getByRole('button', { name: 'Voeg toe' }).click();
  await expect(beleid.getByRole('alert')).toContainText('bedrag');
  await paneel.getByRole('button', { name: 'Paneel sluiten' }).click();

  paneel = await open(page, 'veiling');
  const veiling = paneel.getByTestId('eigen-veiling');
  await veiling.getByLabel('Wat kan de gemeente verkopen?').fill('Het oude pand aan de Kade');
  await veiling.getByLabel(/Opbrengst/).fill('1,5');
  await veiling.getByRole('button', { name: 'Voeg toe' }).click();
  await expect(veiling).toContainText('eenmalig');
  await veiling.getByRole('button', { name: 'Het oude pand aan de Kade weghalen' }).click();
  await expect(veiling).not.toContainText('Het oude pand aan de Kade');
});

test('document in de opbouw van de tegenbegroting van VVD Groningen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('indienen').click();
  await page.getByTestId('maak-tegenbegroting').click();
  const doc = page.getByTestId('document');
  await expect(doc.getByRole('heading', { level: 1 })).toHaveText('Het kan en moet anders.');
  await expect(doc).toContainText(
    'Voor een veilige, ondernemende en financieel verstandige gemeente.',
  );
  for (const kop of ['Inhoudsopgave', 'Opgesteld door', 'Besparingen', 'Investeringen'])
    await expect(doc.getByRole('heading', { level: 2, name: kop })).toBeVisible();
  await expect(
    doc.getByRole('heading', { name: 'Ombuigingen en opbrengsten (x1 miljoen)' }),
  ).toBeVisible();
  await expect(doc.getByRole('heading', { name: 'Uitgaven (x1 miljoen)' })).toBeVisible();
  await expect(doc.locator('th', { hasText: 'Structureel/ incidenteel' }).first()).toBeVisible();
});

test('Opslaan als PDF: geen foto’s in het document, daarna komen ze terug', async ({ page }) => {
  await page.addInitScript(() => {
    // Printen nadoen: tel hoeveel foto's er in het document staan op het moment van printen.
    window.print = () => {
      (window as unknown as { fotos: number }).fotos = document.querySelectorAll(
        '[data-testid="document"] img',
      ).length;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.goto('/');
  await page.getByTestId('indienen').click();
  await page.getByTestId('maak-tegenbegroting').click();
  const doc = page.getByTestId('document');
  await expect(doc.locator('img').first()).toBeAttached();
  await page.getByRole('button', { name: 'Opslaan als PDF' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { fotos?: number }).fotos))
    .toBe(0);
  await expect(doc.locator('img').first()).toBeAttached();
});
