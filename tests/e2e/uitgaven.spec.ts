/** Uitgaven per inwoner vergeleken met andere gemeenten, onderaan een gebouw. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('bij het zwembad: sport per inwoner naast andere gemeenten, met het jaartal erbij', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
  await page.goto('/');
  await expect(page.locator('.kaart-gebouw')).toHaveCount(15);
  const vak = await page.locator('[data-gebouw="zwembad"]').boundingBox();
  if (!vak) throw new Error('zwembad');
  await page.mouse.click(vak.x + vak.width / 2, vak.y + vak.height / 2);
  const v = page.getByTestId('paneel').getByTestId('uitgaven-vergelijking');
  await expect(v.locator('summary')).toContainText('cijfers uit 2026');
  await v.locator('summary').click();
  // Het jaartal en dat het niet om de begroting van de game gaat, staan bovenaan.
  await expect(v.getByTestId('uitgaven-let-op')).toContainText(
    'Let op: dit zijn cijfers uit 2026.',
  );
  await expect(v.getByTestId('uitgaven-let-op')).toContainText('niet uit de begroting 2027');
  await expect(v.getByTestId('uitgaven-let-op')).toContainText(
    'Jouw keuzes zie je hier niet terug',
  );
  const sport = v.locator('[data-thema="sport"]');
  await expect(sport).toContainText('Groningen begrootte in 2026 € 164 per inwoner');
  await expect(sport).toContainText('plaats 31 van de 32');
  await expect(sport.locator('[data-gemeente="Utrecht"]')).toBeVisible();
  await expect(sport.locator('li')).toHaveCount(10);
  await v.screenshot({ path: testInfo.outputPath('uitgaven-kort.png') });
  await sport.getByRole('button', { name: 'Alle 32 grote gemeenten tonen' }).click();
  await expect(sport.locator('li')).toHaveCount(33);
  const axe = await new AxeBuilder({ page })
    .include('[data-testid="uitgaven-vergelijking"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((x) => `${x.id}: ${x.help}`)).toEqual([]);
  await v.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('uitgaven.png'), fullPage: true });
});
