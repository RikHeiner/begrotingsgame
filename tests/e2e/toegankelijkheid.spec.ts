/**
 * Fase 8: automatische toegankelijkheidscontrole (axe, WCAG 2.1 A en AA) op de belangrijkste
 * schermen. Een automatische test vindt niet alles; zie docs/toegankelijkheid in public/.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function controleer(page: Page, naam: string) {
  const uit = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const fouten = uit.violations.map(
    (v) =>
      `${naam}: ${v.id} (${v.impact}) – ${v.help}\n  ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join('\n  ')}`,
  );
  expect(fouten, fouten.join('\n')).toEqual([]);
}

const deellink = () =>
  `/?b=${codeer({ onderdelen: { h1: -10 }, belastingen: { t1: -5 }, kaarten: [], scenario: 'midden' }, 2026)}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('kaart en HUD', async ({ page }) => {
  await page.goto(deellink());
  await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
  await controleer(page, 'kaart');
});

test('gebouwpaneel en lijstweergave', async ({ page }) => {
  await page.goto(deellink());
  await page.getByRole('button', { name: 'Lijst', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alle gebouwen en posten' })).toBeVisible();
  await controleer(page, 'lijst');
});

test('dialogen: waarom, inwoners, voor mij, missies', async ({ page }) => {
  await page.goto(deellink());
  await page.getByTestId('saldo').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await controleer(page, 'waarom');
  await page.keyboard.press('Escape');
  await page.getByTestId('blij').click();
  await controleer(page, 'inwoners');
  await page.getByTestId('open-voor-mij').click();
  await expect(page.getByRole('dialog', { name: 'Wat betekent het voor mij?' })).toBeVisible();
  await controleer(page, 'voor mij');
  await page.keyboard.press('Escape');
  await page.getByTestId('missie').click();
  await controleer(page, 'missies');
});

test('eindscherm, insturen en document', async ({ page }) => {
  await page.goto(deellink());
  await page.getByTestId('indienen').click();
  await expect(page.getByTestId('eindscherm')).toBeVisible();
  await controleer(page, 'eindscherm');
  await page.getByTestId('insturen').click();
  await controleer(page, 'insturen');
  await page.keyboard.press('Escape');
  await page.getByTestId('maak-tegenbegroting').click();
  await expect(page.getByTestId('document')).toBeVisible();
  await controleer(page, 'document');
});

test('campagne', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('missie').click();
  await page.getByTestId('start-campagne').click();
  await expect(page.getByTestId('gebeurtenissen')).toBeVisible();
  await controleer(page, 'campagne');
});

test('dashboard', async ({ page }) => {
  await page.goto('/dashboard.html');
  await expect(page.getByTestId('aantal')).toBeVisible();
  await controleer(page, 'dashboard');
});

test.describe('donkere modus', () => {
  test.use({ colorScheme: 'dark' });

  test('kaart, eindscherm, document en dashboard', async ({ page }) => {
    await page.goto(deellink());
    await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
    await controleer(page, 'kaart (donker)');
    await page.getByTestId('indienen').click();
    await controleer(page, 'eindscherm (donker)');
    await page.getByTestId('maak-tegenbegroting').click();
    await controleer(page, 'document (donker)');
    await page.goto('/dashboard.html');
    await expect(page.getByTestId('aantal')).toBeVisible();
    await controleer(page, 'dashboard (donker)');
  });
});

test('privacy- en toegankelijkheidsverklaring', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByRole('link', { name: 'Privacyverklaring' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacyverklaring' })).toBeVisible();
  await controleer(page, 'privacy');
  await page.screenshot({ path: testInfo.outputPath('privacy.png'), fullPage: true });
  await page.getByRole('link', { name: 'toegankelijkheidsverklaring' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Toegankelijkheidsverklaring' }),
  ).toBeVisible();
  await controleer(page, 'toegankelijkheid');
  await page.getByRole('link', { name: '← Terug naar de game' }).click();
  await expect(page.getByTestId('saldo')).toBeVisible();
});
