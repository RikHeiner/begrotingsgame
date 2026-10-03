/**
 * Het startscherm en de route bij nul. De game begint altijd bij nul; eerst de belasting (met het
 * gemiddelde van Nederland), dan de gebouwen in de volgorde van VVD Groningen. Wat het college
 * koos, zie je pas op het eindscherm.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { codeer } from '../../src/game/deellink';
import { collegeLink } from './hulp';

// Zonder opgeslagen gegevens, zoals bij een eerste bezoek.
test.use({ storageState: { cookies: [], origins: [] } });

const zonderTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));

test('eerste bezoek: uitleg van VVD Groningen, dan bij nul beginnen; daarna niet meer', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const start = page.getByTestId('startscherm');
  await expect(start).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'De gemeente heeft geld nodig' })).toBeVisible();
  await expect(start.getByTestId('afzender')).toHaveText('Een spel van VVD Groningen');
  await expect(start).toContainText('€ 1.586 miljoen');
  await expect(start).toContainText('Meer geld nodig? Verhoog de belasting!');
  // Er is maar één beginpunt: bij nul.
  await expect(page.getByTestId('begin')).toHaveText('Begin bij nul');
  await expect(page.getByTestId('begin-college')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('startscherm.png'), fullPage: true });
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);

  await page.getByTestId('begin').click();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  const route = page.getByTestId('route');
  await expect(route).toContainText('De gemeente heeft geld nodig');
  await expect(page.getByTestId('nul-melding')).toContainText('per jaar te verdelen');
  await expect(page.getByTestId('route-minigames')).toContainText('11 minigames');
  // Boven elk bekend gebouw met een minigame een oranje label (op een telefoon alleen het icoon).
  await expect(page.locator('.kaart-minigame')).toHaveCount(11);
  if (!testInfo.project.name.startsWith('mobiel'))
    await expect(page.locator('.kaart-minigame').first()).toContainText('Speel');
  await expect(page.getByTestId('saldo')).toContainText('+');
  // Geen coachmarks: de route wijst de weg.
  await expect(page.getByTestId('tutorial')).toHaveCount(0);

  // Opnieuw te openen via Instellingen, als uitleg: je keuzes blijven.
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByTestId('uitleg').click();
  await expect(page.getByTestId('startscherm')).toBeVisible();
  await expect(page.getByTestId('begin')).toHaveCount(0);
  await page.getByTestId('start-terug').click();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);

  // Een nieuw bezoek (zonder link): geen startscherm, weer bij nul met de route.
  await page.goto('/');
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('nul-melding')).toBeVisible();
});

test('de route: eerst de belasting met het gemiddelde van Nederland, dan veiligheid', async ({
  page,
}, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await page.getByTestId('begin').click();
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  // De nummers op de kaart: het belastingloket is 1 en is aan de beurt.
  await expect(page.locator('.route-nummer.huidig')).toHaveText('1');
  await expect(page.locator('[data-route="2"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('route-kaart.png') });

  await page.getByTestId('route').getByRole('button', { name: 'Naar het belastingloket' }).click();
  const paneel = page.getByTestId('paneel');
  await expect(paneel).toContainText('Stap 1 van 13 · Financiën');
  const ozb = paneel.getByRole('slider', { name: /Onroerendezaakbelasting/ });
  // Bij nul geen bedrag van het college en geen percentage, wel het bedrag per inwoner.
  await expect(paneel.locator(`output[for="${await ozb.getAttribute('id')}"]`)).toHaveText(
    '€ 0 per inwoner',
  );
  await expect(paneel).not.toContainText('139,4');
  await expect(
    paneel.getByRole('button', { name: /terug naar de begroting van het college/ }),
  ).toHaveCount(0);
  const nl = paneel.getByTestId('gemiddelde-t1');
  await expect(nl).toContainText('Gemiddeld in Nederland: € 350 per inwoner');
  await expect(nl).toContainText('2026');
  await expect(nl).toContainText('niet uit de begroting 2027 van deze game');
  await nl.getByRole('button', { name: /Zet op het gemiddelde van Nederland/ }).click();
  // 350 × 244.427 inwoners = € 85,5 mln
  await expect(
    paneel.getByRole('textbox', { name: /Opbrengst voor .*Onroerendezaakbelasting/ }),
  ).toHaveValue('85,547');
  await expect(paneel.locator(`output[for="${await ozb.getAttribute('id')}"]`)).toHaveText(
    '€ 350 per inwoner',
  );
  await page.screenshot({ path: testInfo.outputPath('route-belasting.png'), fullPage: true });

  await paneel.getByTestId('volgende-stap').click();
  await expect(paneel).toContainText('Stap 2 van 13 · Veiligheid');
  await expect(paneel.getByRole('heading', { level: 2 })).toContainText("Politie en boa's");
  // Ook bij de posten bedragen in plaats van percentages.
  const boas = paneel.getByRole('slider', { name: /Boa's/ });
  await expect(paneel.locator(`output[for="${await boas.getAttribute('id')}"]`)).toHaveText(
    '€ 0,77 mln',
  );
  // Wat merk je ervan: onveiliger dan nu, met het aantal boa's nu en met jouw keuze.
  const gevolg = paneel.getByTestId('gevolg-v2');
  await expect(gevolg).toContainText('Veel onveiliger dan nu');
  await expect(gevolg).toContainText("Nu ongeveer 49 boa's");
  await expect(gevolg).toContainText("met jouw keuze ongeveer 10 boa's");
  await paneel.getByRole('button', { name: 'Paneel sluiten' }).click();
  await expect(page.locator('[data-route="1"]')).toHaveText('✓');
  await expect(page.locator('.route-nummer.huidig')).toHaveText('2');
  await expect(page.getByTestId('route')).toContainText('Stap 2 van 13');
});

test('een gedeelde link opent direct de begroting', async ({ page }) => {
  const b = codeer(
    { onderdelen: { h1: -10 }, belastingen: {}, kaarten: [], scenario: 'midden' },
    2027,
  );
  await page.goto(`/?b=${b}`);
  await expect(page.getByTestId('saldo')).toBeVisible();
  await expect(page.getByTestId('startscherm')).toHaveCount(0);
  await expect(page.getByTestId('route')).toHaveCount(0);
});

test('een oude link met de begroting van het college werkt; opnieuw beginnen gaat bij nul', async ({
  page,
}) => {
  await zonderTutorial(page);
  await page.goto(collegeLink());
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is dicht/);
  await expect(page.getByTestId('route')).toHaveCount(0);
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await expect(page.getByTestId('opnieuw-college')).toHaveCount(0);
  await page.getByTestId('opnieuw-nul').click();
  await expect(page.getByTestId('nul-melding')).toBeVisible();
  await expect(page.getByTestId('geldpotje')).toHaveAttribute('aria-label', /slot is open/);
});

test('beginnen bij nul: op het eindscherm het verschil met het college', async ({
  page,
}, testInfo) => {
  await zonderTutorial(page);
  await page.goto('/');
  await page.getByTestId('begin').click();
  await expect(page.getByTestId('saldo')).toContainText('+');
  await page.getByTestId('indienen').click();
  const v = page.getByTestId('college-vergelijking');
  await expect(v).toBeVisible();
  await expect(v).toContainText('Totaal uitgaven');
  await v.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('nul-eind.png') });
});
