/** Fase 6: het persona-overzicht en "Wat betekent het voor mij?". */
import { expect, test } from '@playwright/test';
import { codeer } from '../../src/game/deellink';

test('Wat betekent het voor mij: een lagere OZB scheelt de eigenaar geld', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: { t1: -10 }, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  await page.getByTestId('blij').click();
  const inwoners = page.getByRole('dialog', { name: /Blije inwoners/ });
  const personas = inwoners.getByTestId('personas');
  await expect(personas.locator(':scope > li')).toHaveCount(9);
  await personas.getByText('Henk', { exact: false }).first().click();
  await expect(personas).toContainText('blij met een lagere onroerendezaakbelasting (−10%)');
  await page.screenshot({ path: testInfo.outputPath('inwoners.png') });

  await inwoners.getByTestId('open-voor-mij').click();
  const d = page.getByRole('dialog', { name: 'Wat betekent het voor mij?' });
  const tabel = d.getByTestId('voor-mij-tabel');
  // 0,1473% van € 340.000 = € 501; met −10% € 451
  await expect(tabel.locator('[data-heffing="OZB"]')).toContainText('€ 501');
  await expect(tabel.locator('[data-heffing="OZB"]')).toContainText('€ 451');
  await expect(d.getByTestId('voor-mij-verschil')).toHaveText('− € 50');

  // Peter en Tineke: Oosterpoort, twee vergunningen
  await d.getByLabel(/parkeervergunning voor bewoners/).selectOption('tweede');
  await d.getByLabel('Aantal vergunningen').selectOption('2');
  await expect(tabel.locator('[data-heffing="Parkeervergunning"]')).toContainText('€ 135');
  await expect(tabel.locator('[data-heffing="Tweede parkeervergunning"]')).toContainText('€ 409');
  await page.screenshot({ path: testInfo.outputPath('voor-mij.png'), fullPage: true });
  await tabel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('voor-mij-tabel.png') });

  // Huurhuis: geen OZB-bedrag
  await d.getByLabel('Huurhuis').check();
  await expect(tabel.locator('[data-heffing="OZB"]')).toContainText('onbekend');
  // Er wordt niets opgeslagen
  const opslag = await page.evaluate(() => Object.keys(localStorage));
  expect(opslag.every((k) => !/woz|huishouden|voormij/i.test(k))).toBe(true);
});
