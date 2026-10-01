/** De Playwright-scenario's uit opdracht 12. */
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

const zonderTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));

async function tikOpGebouw(page: Page, id: string) {
  await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
  const vak = await page.locator(`[data-gebouw="${id}"]`).boundingBox();
  if (!vak) throw new Error(id);
  await page.mouse.click(vak.x + vak.width / 2, vak.y + vak.height / 2);
}

async function schuif(page: Page, label: RegExp, stappen: number) {
  const s = page.getByTestId('paneel').getByLabel(label);
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
  await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
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
  await expect(page.getByTestId('saldo')).toContainText('+ € 12,3 mln');
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is open/);
  await page.getByTestId('paneel').getByRole('button', { name: 'Paneel sluiten' }).click();
  await tikOpGebouw(page, 'parkeer');
  await schuif(page, /Parkeercontrole/, -20);
  await expect(page.getByTestId('kettingmelding')).toContainText('🔗');
  await expect(page.getByTestId('paneel')).toContainText('Dit heeft ook effect op');
  await page.screenshot({ path: testInfo.outputPath('ketting.png') });
  // 12,3236 − 1,0 (parkeercontrole) − 3,51 (betaalbereidheid, aanname) = 7,8
  await expect(page.getByTestId('saldo')).toContainText('+ € 7,8 mln');
});

test('missie kiezen en indienen: het eindscherm', async ({ page }, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await page.getByTestId('missie').click();
  await page.getByRole('button', { name: /Lagere lasten/ }).click();
  await expect(page.getByTestId('missie')).toContainText('Lagere lasten');
  await page.getByTestId('indienen').click();
  const eind = page.getByTestId('eindscherm');
  await expect(eind.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(eind).toContainText('Saldo per jaar');
  await expect(eind).toContainText('Wat merken de inwoners?');
  await expect(eind).toContainText('Vergelijking');
  await page.screenshot({ path: testInfo.outputPath('eindscherm.png'), fullPage: true });
  await eind.getByRole('button', { name: 'Terug naar de gemeente' }).click();
  await expect(page.getByTestId('saldo')).toBeVisible();
});

test('een deellink opent dezelfde begroting', async ({ page }) => {
  await zonderTutorial(page);
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: { t1: -5 }, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  // 12,3236 − 6,265 = 6,1
  await expect(page.getByTestId('saldo')).toContainText('+ € 6,1 mln');
  await expect(page.getByText('Je bekijkt een gedeelde begroting')).toBeVisible();
  await page.getByTestId('indienen').click();
  await expect(page.getByTestId('eindscherm')).toContainText('Onroerendezaakbelasting');
});

test('waarom-knop en inwoners', async ({ page }, testInfo) => {
  await zonderTutorial(page);
  const b = codeer(
    { onderdelen: { h1: -10, s3: 20 }, belastingen: {}, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  await page.getByTestId('saldo').click();
  const d = page.getByRole('dialog', { name: 'Waarom dit bedrag?' });
  await expect(d).toContainText('Overhead');
  await expect(d).toContainText('⚠︎');
  await page.screenshot({ path: testInfo.outputPath('waarom.png') });
  await page.keyboard.press('Escape');
  await page.getByTestId('blij').click();
  await expect(page.getByRole('dialog')).toContainText('Peter en Tineke');
});

test('werkt offline na het eerste bezoek (PWA)', async ({ page, context }) => {
  await zonderTutorial(page);
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
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
  await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
  await context.setOffline(false);
});
