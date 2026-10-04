import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const leesData = (bestand: string) =>
  JSON.parse(readFileSync(resolve(import.meta.dirname, '../../data', bestand), 'utf8'));

const config = leesData('config.json') as { tarieven: string };
const tarieven = leesData(config.tarieven) as {
  begrotingsjaar: number;
  afvalstoffenheffing: { twee_personen: number };
};
const bedrag = (x: number) =>
  `€ ${x.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const perJaar = bedrag(tarieven.afvalstoffenheffing.twee_personen);
const perMaand = bedrag(Math.round((tarieven.afvalstoffenheffing.twee_personen / 12) * 100) / 100);

/** Slim kiezen: zuinig, maar ook iets leuks. */
const KEUZE: [RegExp, RegExp][] = [
  [/energierekening/, /Verwarming lager/],
  [/aanslag/, /Betalen/],
  [/Zaterdagavond/, /Uit eten/],
  [/Lekke band/, /Zelf plakken/],
  [/wasmachine/, /Zelf maken/],
  [/Verjaardag/, /Zelfgemaakt/],
  [/weekend/, /dagje wandelen/],
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('Academiegebouw: rondkomen met z’n tweeën, met de afvalstoffenheffing voor 2 personen', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  await page.locator('[data-minigame="academie"]').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('minigame-start').click();
  const spel = page.getByTestId('minigame-academie');
  await expect(spel.getByTestId('mg-academie-start')).toContainText('⚠︎');
  await spel.getByRole('button', { name: 'Begin de maand' }).click();

  // Rustige modus: geen timer, je kiest in je eigen tempo.
  const stand = spel.getByTestId('mg-academie-stand');
  await expect(stand).toContainText('Kaart 1 van');
  await expect(stand).not.toContainText('Tijd');
  await expect(spel.locator('canvas[role="img"]')).toHaveAttribute('aria-label', /spaarpot/);

  let aanslag = false;
  for (let i = 0; i < 12; i++) {
    const kaart = spel.getByTestId('mg-academie-kaart');
    if (!(await kaart.isVisible())) break;
    await expect(stand).toContainText(`Kaart ${i + 1} van`);
    const titel = (await kaart.getByRole('heading').textContent()) ?? '';
    const week = Number(/Week (\d)/.exec((await kaart.textContent()) ?? '')?.[1]);
    if (/aanslag/.test(titel)) {
      aanslag = true;
      await expect(kaart).toContainText(`${perJaar} per jaar`);
      await expect(kaart).toContainText(`${perMaand} per maand`);
      await expect(kaart).toContainText('2 personen');
      await expect(kaart).toContainText('verhuurder');
    }
    const regel = KEUZE.find(([t]) => t.test(titel));
    const knop = regel
      ? kaart.getByRole('button', { name: regel[1] })
      : // boodschappen: in week 1 en 3 wat lekkers, anders zuinig
        kaart.getByRole('button').nth(week === 1 || week === 3 ? 1 : 0);
    if (i === 0) {
      // met het toetsenbord kiezen kan ook: toets 2
      await kaart.getByRole('heading').click();
      await page.keyboard.press('2');
      await expect(spel.locator('.mg-status')).toContainText('Wat we lekker vinden');
    } else await knop.click();
  }
  expect(aanslag).toBe(true);

  const uitslag = spel.getByTestId('mg-academie-uitslag');
  await expect(uitslag).toContainText('Gelukt');
  await expect(uitslag.getByTestId('mg-academie-gemeente')).toContainText(perMaand);
  await expect(uitslag.getByTestId('mg-academie-gemeente')).toContainText('naar de gemeente');
  await expect(uitslag).toContainText(`2 personen ${perJaar}`);
  await expect(uitslag).toContainText('Kwijtschelding');
  await expect(uitslag.getByTestId('mg-academie-afval')).toContainText('mln');
  await expect(uitslag).not.toContainText(/tegenbegroting/i);
  await uitslag.getByRole('button', { name: 'Naar de uitslag' }).click();
  const klaar = page.getByTestId('minigame-klaar');
  await expect(klaar).toBeVisible();
  await expect(klaar).toContainText('100 van de 100');
});
