/** De Playwright-scenario's uit opdracht 12. */
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

const zonderTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));

async function tikOpGebouw(page: Page, id: string) {
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  const vak = await page.locator(`[data-gebouw="${id}"]`).boundingBox();
  if (!vak) throw new Error(id);
  await page.mouse.click(vak.x + vak.width / 2, vak.y + vak.height / 2);
}

async function schuif(page: Page, label: RegExp, stappen: number) {
  const s = page.getByTestId('paneel').getByRole('slider', { name: label });
  await s.focus();
  for (let i = 0; i < Math.abs(stappen); i++)
    await page.keyboard.press(stappen < 0 ? 'ArrowLeft' : 'ArrowRight');
  return s;
}

test('eerste bezoek: de tutorial in drie stappen, daarna niet meer', async ({ page }, testInfo) => {
  await page.goto('/');
  const coach = page.getByTestId('tutorial');
  await expect(coach).toContainText('Dit is jouw gemeente. Tik op een gebouw.');
  await page.screenshot({ path: testInfo.outputPath('tutorial-1.png') });
  await page.getByRole('button', { name: /Stadhuis/ }).focus();
  await page.keyboard.press('Enter');
  await expect(coach).toContainText('Schuif naar links om te bezuinigen');
  await schuif(page, /Overhead/, -2);
  await expect(coach).toContainText('Nu is het slot eraf');
  await page.screenshot({ path: testInfo.outputPath('tutorial-3.png') });
  await coach.getByRole('button', { name: 'Begrepen' }).click();
  await expect(coach).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await expect(page.getByTestId('tutorial')).toHaveCount(0);
});

test('het slot van de pot: zonder vrijgemaakt geld kan er niets bij', async ({ page }) => {
  await zonderTutorial(page);
  await page.goto('/');
  await tikOpGebouw(page, 'zwembad');
  const sport = await schuif(page, /Sporthallen/, 1);
  await expect(page.getByTestId('melding')).toContainText('structurele dekking nodig');
  await expect(sport).toHaveValue('0');
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is dicht/);
});

test('bezuinigen en daarna investeren; een kettingeffect geeft een melding', async ({
  page,
}, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await tikOpGebouw(page, 'stadhuis');
  await schuif(page, /Overhead/, -2);
  await expect(page.getByTestId('saldo')).toContainText('+ € 13,2 mln');
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is open/);
  await page.getByTestId('paneel').getByRole('button', { name: 'Paneel sluiten' }).click();
  await tikOpGebouw(page, 'parkeer');
  await schuif(page, /Parkeercontrole/, -20);
  await expect(page.getByTestId('kettingmelding')).toContainText('🔗');
  await expect(page.getByTestId('paneel')).toContainText('Dit heeft ook effect op');
  await page.screenshot({ path: testInfo.outputPath('ketting.png') });
  // 13,15 (overhead) + 0,2 (parkeercontrole: 0,2 × (7,3 − 6,3)) − 2,85 (betaalbereidheid, aanname) = 10,5
  await expect(page.getByTestId('saldo')).toContainText('+ € 10,5 mln');
});

test('een bedrag invullen in plaats van een percentage', async ({ page }, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await tikOpGebouw(page, 'stadhuis');
  const paneel = page.getByTestId('paneel');
  const veld = paneel.getByRole('textbox', { name: /Budget voor .*Overhead/ });
  const overhead = paneel.getByRole('slider', { name: /Overhead/ });
  const basis = await veld.inputValue();
  expect(basis).toMatch(/^\d+,\d{2,3}$/);
  // 10% lager budget, als bedrag ingetypt
  const nieuw = (Number(basis.replace(',', '.')) * 0.9).toFixed(3).replace('.', ',');
  await veld.fill(nieuw);
  await veld.press('Enter');
  await expect(paneel.locator(`output[for="${await overhead.getAttribute('id')}"]`)).toHaveText(
    '−10%',
  );
  await expect(page.getByTestId('saldo')).toContainText('+ € 13,2 mln');
  await page.screenshot({ path: testInfo.outputPath('bedrag.png') });
  // Een tarief bij de parkeergarage
  await paneel.getByRole('button', { name: 'Paneel sluiten' }).click();
  await tikOpGebouw(page, 'parkeer');
  const tarief = paneel.getByRole('textbox', {
    name: /Tarief voor .*Bewonersvergunning \(tweede zone\)/,
  });
  await expect(tarief).toHaveValue('141,24');
  await tarief.fill('155,36');
  await tarief.press('Enter');
  await expect(paneel).toContainText('Nieuw tarief: € 155,36 per jaar');
});

test('parkeertarieven per vergunning en zone bij de parkeergarage', async ({ page }, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await tikOpGebouw(page, 'parkeer');
  const paneel = page.getByTestId('paneel');
  await expect(paneel.getByRole('heading', { name: 'Parkeertarieven' })).toBeVisible();
  const s = await schuif(page, /Bewonersvergunning \(tweede zone\)/, 2);
  await expect(s).toHaveValue('10');
  await expect(paneel).toContainText('Nieuw tarief: € 155,36 per jaar');
  await paneel.getByRole('heading', { name: 'Parkeertarieven' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('parkeren.png') });
  await paneel.getByRole('button', { name: 'Paneel sluiten' }).click();
  // Het loket verwijst naar de parkeergarage
  await tikOpGebouw(page, 'loket');
  await expect(paneel).toContainText('stel je per vergunning en zone in bij de Parkeergarage');
});

test('indienen: het eindscherm, zonder missies en zonder meters', async ({ page }, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await expect(page.getByTestId('missie')).toHaveCount(0);
  await expect(page.getByText(/missie/i)).toHaveCount(0);
  await page.getByTestId('indienen').click();
  const eind = page.getByTestId('eindscherm');
  await expect(eind.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(eind.getByRole('img', { name: /van de 3 sterren/ })).toBeVisible();
  await expect(eind).not.toContainText('Meters');
  await expect(eind).toContainText('Saldo per jaar');
  await expect(eind).toContainText('Wat merken de inwoners?');
  await expect(eind).toContainText('Jouw begroting naast die van het college');
  await page.screenshot({ path: testInfo.outputPath('eindscherm.png'), fullPage: true });
  await eind.getByRole('button', { name: 'Terug naar de gemeente' }).click();
  await expect(page.getByTestId('saldo')).toBeVisible();
});

test('een deellink opent dezelfde begroting', async ({ page }) => {
  await zonderTutorial(page);
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: { t1: -5 }, kaarten: [], scenario: 'midden' },
    2027,
  );
  await page.goto(`/?b=${b}`);
  // 0,1 × (134,9 − 3,4) − 0,05 × 139,441 = 13,150 − 6,972 = 6,2
  await expect(page.getByTestId('saldo')).toContainText('+ € 6,2 mln');
  await expect(page.getByText('Je bekijkt een gedeelde begroting')).toBeVisible();
  await page.getByTestId('indienen').click();
  await expect(page.getByTestId('eindscherm')).toContainText('Onroerendezaakbelasting');
});

test('waarom-knop en inwoners', async ({ page }, testInfo) => {
  await zonderTutorial(page);
  const b = codeer(
    { onderdelen: { h1: -10, s3: 20 }, belastingen: {}, kaarten: [], scenario: 'midden' },
    2027,
  );
  await page.goto(`/?b=${b}`);
  await page.getByTestId('saldo').click();
  const d = page.getByRole('dialog', { name: 'Waarom dit bedrag?' });
  await expect(d).toContainText('Overhead');
  await expect(d).toContainText('⚠︎');
  await page.screenshot({ path: testInfo.outputPath('waarom.png') });
  await page.keyboard.press('Escape');
  await page.getByTestId('inwoners').click();
  await expect(page.getByRole('dialog')).toContainText('Peter en Tineke');
});

test('werkt offline na het eerste bezoek (PWA)', async ({ page, context }) => {
  await zonderTutorial(page);
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((klaar) =>
        navigator.serviceWorker.addEventListener('controllerchange', klaar, { once: true }),
      );
    }
    return reg.active?.state;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await context.setOffline(false);
});

test('een opmerking van een inwoner brengt je naar de post', async ({ page }) => {
  await zonderTutorial(page);
  const b = codeer(
    { onderdelen: { o1: -20 }, belastingen: {}, kaarten: [], scenario: 'midden' },
    2027,
  );
  await page.goto(`/?b=${b}`);
  await page.getByRole('button', { name: /Inwoners/ }).click();
  await page.locator('summary', { hasText: 'Peter en Tineke' }).click();
  await page
    .getByRole('button', { name: /last van minder geld voor onderhoud.*Naar Onderhoud/ })
    .click();
  const paneel = page.getByTestId('paneel');
  await expect(paneel.getByRole('heading')).toContainText('Park');
  await expect(paneel.getByRole('textbox', { name: /Budget voor .*Onderhoud/ })).toBeFocused();
});
