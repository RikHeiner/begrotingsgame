/**
 * Fase 5: insturen en het dashboard. De tests draaien met de lokale opslag (VITE_OPSLAG=lokaal):
 * de inzending staat in de browser, en het dashboard leest hem daar. De regels van de echte
 * database worden apart getest (npm run db:test).
 */
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

async function speelEnIndienen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: { t1: -5 }, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  await expect(page.getByTestId('saldo')).toContainText('+ € 6,1 mln');
  await page.getByTestId('indienen').click();
  await page
    .getByTestId('eindscherm')
    .getByLabel('Mijn eigen idee')
    .fill('Meer bankjes in het park.');
}

test('insturen vraagt eerst toestemming, daarna staat de inzending in het dashboard', async ({
  page,
}, testInfo) => {
  await speelEnIndienen(page);
  // De speler is "langer bezig" dan de minimale speelduur van het spamfilter.
  await page.clock.setSystemTime(new Date(Date.now() + 60_000));
  await page.getByTestId('insturen').click();
  const d = page.getByRole('dialog', { name: 'Stuur in naar de fractie' });
  await expect(d).toBeVisible();
  await expect(d.getByLabel('Mijn eigen idee')).toHaveValue('Meer bankjes in het park.');
  await expect(d.getByTestId('verstuur')).toBeDisabled();
  await d.getByLabel(/In welk gebied/).selectOption({ label: 'Zuid' });
  await d.getByText('Wat gebeurt er met mijn gegevens?').click();
  await expect(d).toContainText('IP-adres slaan we niet op');
  await page.screenshot({ path: testInfo.outputPath('insturen.png'), fullPage: true });
  await d.getByLabel(/Ik geef toestemming/).check();
  await d.getByTestId('verstuur').click();
  await expect(d.getByTestId('ingestuurd')).toContainText('Bedankt');
  await d.getByTestId('ingestuurd').getByRole('button', { name: 'Sluiten' }).click();
  await expect(page.getByTestId('insturen')).toHaveText('Ingestuurd ✓');
  await expect(page.getByTestId('insturen')).toBeDisabled();

  // Het dashboard (zelfde browser, dus dezelfde lokale opslag)
  await page.goto('/dashboard.html');
  await expect(page.getByText('Demo: dit zijn de inzendingen uit deze browser')).toBeVisible();
  await expect(page.getByTestId('aantal')).toHaveText('1');
  const posten = page.getByTestId('per-post');
  await expect(posten.getByRole('row', { name: /Overhead/ })).toContainText('−10%');
  await expect(posten.getByRole('row', { name: /Onroerendezaakbelasting/ })).toContainText('−5%');
  await expect(page.getByTestId('heatmap')).toBeVisible();
  const ideeen = page.getByTestId('ideeen');
  await expect(ideeen).toContainText('Meer bankjes in het park.');
  await expect(ideeen).toContainText('Zuid');
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });

  // Modereren
  await ideeen.getByRole('button', { name: 'Goedkeuren' }).click();
  await expect(ideeen.locator('li')).toHaveCount(0);
  await page.getByRole('combobox', { name: /^Toon/ }).selectOption('goedgekeurd');
  await expect(ideeen).toContainText('✓ Goedgekeurd');

  // CSV
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('csv').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^inzendingen-2026-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = (await readFile(await download.path(), 'utf8')).replace(/^\uFEFF/, '');
  const [kop = '', rij = '', ...rest] = csv.trimEnd().split('\r\n');
  expect(rest).toHaveLength(0);
  const k = kop.split(';');
  const r = rij.split(';');
  const waarde = (naam: RegExp) => r[k.findIndex((x) => naam.test(x))];
  expect(waarde(/^gebied$/)).toBe('Zuid');
  expect(waarde(/^h1 /)).toBe('-10');
  expect(waarde(/^t1 /)).toBe('-5');
  expect(waarde(/^saldo structureel/)).toBe('6,059');
  expect(waarde(/^sluitend$/)).toBe('ja');
  expect(waarde(/^idee$/)).toBe('Meer bankjes in het park.');
  expect(waarde(/^status idee$/)).toBe('goedgekeurd');
});

test('een e-mailadres vraagt een aparte toestemming en staat los van de inzending', async ({
  page,
}) => {
  await speelEnIndienen(page);
  await page.clock.setSystemTime(new Date(Date.now() + 60_000));
  await page.getByTestId('insturen').click();
  const d = page.getByRole('dialog', { name: 'Stuur in naar de fractie' });
  await d.getByLabel(/Ik geef toestemming/).check();
  await d.getByLabel(/Houd me op de hoogte/).check();
  await expect(d.getByTestId('verstuur')).toBeDisabled();
  await d.getByLabel('Mijn e-mailadres').fill('inwoner@example.nl');
  await d.getByTestId('verstuur').click();
  await expect(d.getByTestId('ingestuurd')).toBeVisible();
  const opgeslagen = await page.evaluate(() => ({
    inzendingen: localStorage.getItem('begrotingsgame:demo-inzendingen') ?? '',
    aanmeldingen: localStorage.getItem('begrotingsgame:demo-aanmeldingen') ?? '',
  }));
  expect(opgeslagen.inzendingen).not.toContain('inwoner@example.nl');
  expect(opgeslagen.aanmeldingen).toContain('inwoner@example.nl');
});

test('een idee met een telefoonnummer geeft een waarschuwing', async ({ page }) => {
  await speelEnIndienen(page);
  await page.getByTestId('insturen').click();
  const d = page.getByRole('dialog', { name: 'Stuur in naar de fractie' });
  await d.getByLabel('Mijn eigen idee').fill('Bel me op 06-12345678');
  await expect(d).toContainText('Laat namen, adressen en telefoonnummers weg');
});

test('dashboard met veel inzendingen: combinaties, heatmap en zoeken', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('begrotingsgame:demo-inzendingen')) return;
    const gebieden = ['centrum', 'noord', 'zuid', 'zuid', 'zuid', 'west', 'oost', 'haren', ''];
    const ideeen = [
      'Meer bankjes in het park',
      'Gratis parkeren op zaterdag',
      '',
      '',
      'Bel me 0612345678',
    ];
    const rijen = Array.from({ length: 40 }, (_, i) => ({
      id: `demo-${i}`,
      aangemaakt: new Date(Date.UTC(2026, 9, 1, 8, i)).toISOString(),
      begrotingsjaar: 2026,
      keuzes: {
        onderdelen: { h1: -10 - (i % 3) * 5, ...(i % 2 ? { s3: 10 } : {}) },
        belastingen: i % 4 ? { t1: -5 } : {},
        kaarten: [],
        scenario: 'midden',
      },
      missie: null,
      gebied: gebieden[i % gebieden.length] || null,
      idee: ideeen[i % ideeen.length] || null,
      idee_status: ideeen[i % ideeen.length]
        ? i % ideeen.length === 4
          ? 'verdacht'
          : 'nieuw'
        : 'geen',
      toestemming_versie: 1,
    }));
    localStorage.setItem('begrotingsgame:demo-inzendingen', JSON.stringify(rijen));
  });
  await page.goto('/dashboard.html');
  await expect(page.getByTestId('aantal')).toHaveText('40');
  await expect(page.getByRole('heading', { name: 'Populairste combinaties' })).toBeVisible();
  await expect(page.locator('.dash-combinaties li').first()).toContainText('×');
  await expect(page.getByTestId('heatmap')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Zoeken' }).fill('parkeren');
  await expect(page.getByTestId('ideeen').locator('li').first()).toContainText('Gratis parkeren');
  await page.getByRole('searchbox', { name: 'Zoeken' }).fill('');
  await expect(page.getByTestId('ideeen')).toContainText('⚠︎ Verdacht');
  await expect(page.getByTestId('ideeen').locator('li')).toHaveCount(20);
  await page.getByRole('button', { name: 'Toon 4 meer' }).click();
  await expect(page.getByTestId('ideeen').locator('li')).toHaveCount(24);
  await page.screenshot({ path: testInfo.outputPath('dashboard-veel.png'), fullPage: true });
});
