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
  await page.getByTestId('inwoners').click();
  const inwoners = page.getByRole('dialog', { name: 'Inwoners' });
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

test('Wat betekent het voor mij: woonlasten vergeleken met andere gemeenten', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  const b = codeer(
    { onderdelen: {}, belastingen: { t1: -10 }, kaarten: [], scenario: 'midden' },
    2026,
  );
  await page.goto(`/?b=${b}`);
  await page.getByTestId('inwoners').click();
  await page.getByRole('dialog', { name: 'Inwoners' }).getByTestId('open-voor-mij').click();
  const d = page.getByRole('dialog', { name: 'Wat betekent het voor mij?' });
  const v = d.getByTestId('woonlasten-vergelijking');
  // COELO 2026: € 1.267,92 voor een meerpersoonshuishouden met een koophuis, plaats 293 van 342.
  await expect(v).toContainText('€ 1.268');
  await expect(v).toContainText('plaats 293 van de 342');
  await expect(v).toContainText('gemiddeld in Nederland: € 1.095');
  // Met −10% OZB: 1.267,92 − 68,71 = € 1.199
  await expect(v.getByTestId('woonlasten-straks')).toContainText('€ 1.199');
  await expect(v.locator('[data-gemeente="Amsterdam"]')).toBeVisible();
  await v.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('woonlasten-steden.png') });
  await v.getByRole('button', { name: 'Provincie Groningen' }).click();
  await expect(v.locator('[data-gemeente="Westerwolde"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('woonlasten-provincie.png') });

  await d.getByLabel('Huurhuis').check();
  await expect(v).toContainText('€ 402');
  await expect(v).toContainText('plaats 79 van de 342');
});
