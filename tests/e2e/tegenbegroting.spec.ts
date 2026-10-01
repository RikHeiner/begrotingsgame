/** De tegenbegroting als document, met export naar Word en een afbeelding (fase 4). */
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

const zonderTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));

async function naarDocument(page: Page) {
  await zonderTutorial(page);
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: { t1: -5 }, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  await page.getByTestId('indienen').click();
  const eind = page.getByTestId('eindscherm');
  await eind.getByLabel('Titel').fill('Groningen kan het');
  await eind.getByLabel(/Naam/).fill('Test Speler');
  await eind.getByLabel('Mijn eigen idee').fill('Meer bankjes in het park.');
  await page.getByTestId('maak-tegenbegroting').click();
  return page.getByTestId('document');
}

test('het document toont de keuzes en het financieel overzicht', async ({ page }, testInfo) => {
  const doc = await naarDocument(page);
  await expect(doc.getByRole('heading', { level: 1 })).toHaveText('Groningen kan het');
  await expect(doc).toContainText('Test Speler');
  await expect(doc.getByRole('heading', { name: 'Financieel overzicht' })).toBeVisible();
  await expect(doc).toContainText('Overhead');
  await expect(doc).toContainText('Onroerendezaakbelasting');
  await expect(doc).toContainText('Meer bankjes in het park.');
  // 12,3236 − 6,265 = 6,059
  await expect(page.getByTestId('doc-saldo-s')).toHaveText('6,059');
  await page.screenshot({ path: testInfo.outputPath('document.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Download Word' })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('document-print.png'), fullPage: true });
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: '← Terug' }).click();
  await expect(page.getByTestId('eindscherm')).toBeVisible();
});

test('Word downloaden geeft een .docx-bestand', async ({ page }) => {
  await naarDocument(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-word').click(),
  ]);
  expect(download.suggestedFilename()).toBe('groningen-kan-het.docx');
  const pad = await download.path();
  const inhoud = await readFile(pad);
  expect(inhoud.subarray(0, 2).toString()).toBe('PK');
  await expect(page.getByRole('status').filter({ hasText: 'gedownload' })).toBeVisible();
});

test('de afbeelding is een PNG van 1080 bij 1350', async ({ page }, testInfo) => {
  await naarDocument(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-afbeelding').click(),
  ]);
  expect(download.suggestedFilename()).toBe('groningen-kan-het.png');
  await download.saveAs(testInfo.outputPath('afbeelding.png'));
  const inhoud = await readFile(await download.path());
  expect(inhoud.subarray(1, 4).toString()).toBe('PNG');
  expect(inhoud.readUInt32BE(16)).toBe(1080);
  expect(inhoud.readUInt32BE(20)).toBe(1350);
});
