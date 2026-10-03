/**
 * Het startscherm met uitleg: bij het eerste bezoek, niet bij een gedeelde link. De game begint
 * standaard bij nul; met de tweede knop begin je met de begroting van het college.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

// Zonder opgeslagen gegevens, zoals bij een eerste bezoek.
test.use({ storageState: { cookies: [], origins: [] } });

const zonderTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));

test('eerste bezoek: uitleg, dan bij nul beginnen; daarna niet meer', async ({
  page,
}, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  const start = page.getByTestId('startscherm');
  await expect(start).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Jij bent gemeenteraadslid' })).toBeVisible();
  await expect(start).toContainText('€ 1.586 miljoen');
  await expect(start).toContainText('Wie betaalt meer, wie minder?');
  await expect(start).toContainText('Wat kan minder, of later?');
  await expect(page.getByTestId('begin')).toHaveText('Begin bij nul');
  await page.screenshot({ path: testInfo.outputPath('startscherm.png'), fullPage: true });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  // De gemeente staat er al achter, bij nul: er is geld te verdelen.
  await expect(page.getByTestId('saldo')).toBeAttached();
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('nul-melding')).toContainText('per jaar te verdelen');
  await expect(page.getByTestId('saldo')).toContainText('+');
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is open/);

  // Opnieuw te openen via Instellingen, als uitleg: je keuzes blijven.
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByTestId('uitleg').click();
  await expect(page.getByTestId('startscherm')).toBeVisible();
  await expect(page.getByTestId('begin')).toHaveCount(0);
  await page.getByTestId('start-terug').click();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByTestId('uitleg').click();
  // Escape sluit de pop-up ook.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('startscherm')).toHaveCount(0);

  // Een nieuw bezoek (zonder link): geen startscherm, weer bij nul.
  await page.goto('/');
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('nul-melding')).toBeVisible();
});

test('met de begroting van het college beginnen; de game onthoudt dat', async ({ page }) => {
  await zonderTutorial(page);
  await page.goto('/');
  await page.getByTestId('begin-college').click();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('nul-melding')).toHaveCount(0);
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is dicht/);
  await page.goto('/');
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is dicht/);
  // Via Instellingen terug naar nul.
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByTestId('opnieuw-nul').click();
  await expect(page.getByTestId('nul-melding')).toBeVisible();
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is open/);
});

test('een gedeelde link opent direct de begroting', async ({ page }) => {
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: {}, kaarten: [], scenario: 'midden' },
    2027,
  );
  await page.goto(`/?b=${b}`);
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('nul-melding')).toHaveCount(0);
});

test('bij nul: de tutorial vraagt om iets terug te zetten', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByTestId('begin').click();
  await page.getByTestId('nul-melding').getByRole('button', { name: 'Oké' }).click();
  const coach = page.getByTestId('tutorial');
  await expect(coach).toContainText('Alles staat op het minimum');
  await page.getByRole('button', { name: /Stadhuis/ }).focus();
  await page.keyboard.press('Enter');
  await expect(coach).toContainText('Schuif naar rechts');
  const s = page.getByTestId('paneel').getByRole('slider', { name: /Concernposten/ });
  await s.focus();
  await page.keyboard.press('ArrowRight');
  await expect(coach).toContainText('Goed zo');
  await page.screenshot({ path: testInfo.outputPath('tutorial-nul.png') });
  await coach.getByRole('button', { name: 'Begrepen' }).click();
  await expect(coach).toHaveCount(0);
});

test('bij nul: het knopje college zet een post terug op de begroting van het college', async ({
  page,
}) => {
  await zonderTutorial(page);
  await page.goto('/');
  await page.getByTestId('begin').click();
  await page.getByRole('button', { name: /Stadhuis/ }).focus();
  await page.keyboard.press('Enter');
  const paneel = page.getByTestId('paneel');
  const wijk = paneel.getByRole('slider', { name: /Concernposten/ });
  await expect(wijk).toHaveValue('-100');
  await paneel
    .getByRole('button', { name: /Concernposten.*terug naar de begroting van het college/ })
    .click();
  await expect(wijk).toHaveValue('0');
});

test('beginnen bij nul: op het eindscherm het verschil met het college', async ({
  page,
}, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('saldo')).toContainText('+');
  await page.screenshot({ path: testInfo.outputPath('nul.png') });
  await page.getByTestId('indienen').click();
  const v = page.getByTestId('college-vergelijking');
  await expect(v).toBeVisible();
  await expect(v).toContainText('Totaal uitgaven');
  await v.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('nul-eind.png') });
});
