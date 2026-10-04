/** Het Beleidshuis: programma's stopzetten of weer aanzetten, en nieuwe plannen. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { collegeLink } from './hulp';

const zonderTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));

async function openBeleidshuis(page: Page) {
  await page.getByRole('button', { name: /Lijst/ }).click();
  const lijst = page.getByTestId('lijstweergave');
  await lijst.locator('summary', { hasText: 'Beleidshuis' }).click();
  return lijst;
}

test('met de begroting van het college: een programma stopzetten scheelt geld', async ({
  page,
}, testInfo) => {
  await zonderTutorial(page);
  await page.goto(collegeLink());
  const lijst = await openBeleidshuis(page);
  const groen = lijst.getByTestId('programma-p_vitamine_g');
  await expect(groen).toHaveAttribute('aria-pressed', 'true');
  await groen.click();
  await expect(groen).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('saldo')).toContainText('+ € 0,5 mln');
  await expect(lijst.getByRole('heading', { name: 'Keuzes' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('beleidshuis.png'), fullPage: true });
  const axe = await new AxeBuilder({ page })
    .include('[data-testid="lijstweergave"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

test.describe('bij nul', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [
            { name: 'begrotingsgame:start', value: 'gezien' },
            { name: 'begrotingsgame:tutorial', value: 'klaar' },
            { name: 'begrotingsgame:modus', value: 'uitgebreid' },
          ],
        },
      ],
    },
  });

  test("structurele programma's lopen zoals nu; stopzetten scheelt geld", async ({ page }) => {
    await page.goto('/');
    const voor = await page.getByTestId('saldo').textContent();
    const lijst = await openBeleidshuis(page);
    const groen = lijst.getByTestId('programma-p_vitamine_g');
    await expect(groen).toHaveAttribute('aria-pressed', 'true');
    // Een eenmalig programma staat stil (geen eenmalige kosten bij nul); je kunt het aanzetten.
    const fonds = lijst.getByTestId('programma-p_preventiefonds_jeugd');
    await expect(fonds).toBeEnabled();
    await expect(fonds).toHaveAttribute('aria-pressed', 'false');
    await groen.click();
    await expect(groen).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('saldo')).not.toHaveText(voor ?? '');
  });
});
