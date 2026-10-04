/** Tussendoor een minigame, opslaan en later verder, parkeren en het ambtenarenapparaat. */
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

test('na drie stappen van de route: tussendoor een minigame', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('route').getByRole('button', { name: 'Naar het belastingloket' }).click();
  const paneel = page.getByTestId('paneel');
  for (const stap of [2, 3]) {
    await paneel.getByTestId('volgende-stap').click();
    await expect(paneel).toContainText(`Stap ${stap} van 14`);
    await expect(page.getByTestId('tussendoor')).toHaveCount(0);
  }
  await paneel.getByTestId('volgende-stap').click();
  const aanbod = page.getByRole('dialog', { name: 'Even pauze?' });
  await expect(aanbod).toBeVisible();
  await aanbod.getByRole('button', { name: /^Speel / }).click();
  await expect(page.getByTestId('minigame-start')).toBeVisible();
});

test('opslaan en later verder', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('opslaan').click();
  const d = page.getByRole('dialog', { name: 'Opslaan en later verder' });
  await expect(d.getByTestId('opgeslagen')).toContainText('bewaard op dit apparaat');
  await expect(d).toContainText('?b=');
  await d.getByRole('button', { name: 'Verder spelen' }).click();
  await expect(d).toHaveCount(0);
});

test('parkeren: de prijs van nu bij een vergunning, en het uurtarief in euro per uur', async ({
  page,
}) => {
  await page.goto('/');
  const paneel = await open(page, 'parkeer');
  await expect(paneel).toContainText('Nu: € 141,24 per jaar');
  await expect(paneel).toContainText('Nu per uur op straat: Zone 1: € 5,00 (2026)');
  const kort = paneel.getByRole('slider', { name: /Kortparkeren/ });
  await expect(paneel.locator(`output[for="${await kort.getAttribute('id')}"]`)).toHaveText(
    '€ 0,00 per uur',
  );
  await expect(
    paneel.getByRole('textbox', { name: /Uurtarief binnenstad voor .*Kortparkeren/ }),
  ).toHaveAccessibleName(/per uur/);
});

test('zakelijke dienstverlening en de mobiliteitsvisie: wat merk je ervan', async ({ page }) => {
  await page.goto('/');
  let paneel = await open(page, 'park');
  // Bij nul blijft deze post staan (schrappen kost geld); zet hem zelf op nul.
  await expect(paneel.getByTestId('gevolg-o4')).toContainText('Zoals nu');
  await paneel.getByRole('slider', { name: /Zakelijke dienstverlening/ }).focus();
  await page.keyboard.press('Home');
  await expect(paneel.getByTestId('gevolg-o4')).toContainText('kerntaken');
  await expect(paneel.getByTestId('gevolg-o4')).toContainText('inkomsten');
  await paneel.getByRole('button', { name: 'Paneel sluiten' }).click();
  paneel = await open(page, 'parkeer');
  await expect(paneel.getByTestId('gevolg-m4')).toContainText('30 in plaats van 50 km per uur');
});

test('Beleidshuis: het ambtenarenapparaat en 5% minder ambtenaren', async ({ page }) => {
  await page.goto('/');
  const paneel = await open(page, 'beleid');
  const a = paneel.getByTestId('apparaat');
  await expect(a).toContainText('3.681 fte');
  await expect(a).toContainText('14,7 in 2025');
  await expect(a).toContainText('2027 naar 13,1');
  // Andere gemeenten, met het jaar en of het een plan of echt is.
  await expect(a).toContainText('Zwolle (begroting 2026)7,5');
  await expect(a).toContainText('Utrecht (echt in 2025)15,1');
  await expect(a).toContainText('Groningen (echt in 2025)14,7');
  const kaart = paneel.locator('[data-post="k_apparaat_5"] button');
  await expect(kaart).toContainText('17,90');
  await kaart.click();
  await expect(kaart).toHaveAttribute('aria-pressed', 'true');
});

test('elke schuif: wat de gemeente nu doet staat in het midden; lager dan het minimum kan niet', async ({
  page,
}) => {
  await page.goto('/');
  const paneel = await open(page, 'zorg');
  const bw = paneel.getByRole('slider', { name: /Beschermd wonen/ });
  // Het bereik is even groot naar links als naar rechts: 0% (nu) is het midden.
  const min = Number(await bw.getAttribute('min'));
  const max = Number(await bw.getAttribute('max'));
  expect(min).toBe(-max);
  // Het wettelijke minimum is -15%: verder naar links gaat niet.
  await expect(bw).toHaveAttribute('aria-valuemin', '-15');
  await bw.focus();
  await page.keyboard.press('Home');
  await expect(bw).toHaveValue('-15');
  await expect(paneel.locator('[data-post="z2"] .schuif-nu')).toHaveText('nu');
});
