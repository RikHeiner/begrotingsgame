import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test.describe('gemeentekaart', () => {
  test('de kaart laadt met alle gebouwen en inwoners die praten', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Maak de begroting van de gemeente Groningen',
    );
    await expect(page.locator('.kaart canvas')).toBeVisible();
    await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
    await expect(page.getByTestId('ballon')).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: testInfo.outputPath('kaart.png') });
  });

  test('tik op een gebouw opent het paneel; bezuinigen verandert het gebouw en het saldo', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
    // Tik op het zwembad (op de kaart zelf, niet op de onzichtbare knop)
    const knop = page.locator('[data-gebouw="zwembad"]');
    const vak = await knop.boundingBox();
    if (!vak) throw new Error('geen zwembad');
    await page.mouse.click(vak.x + vak.width / 2, vak.y + vak.height / 2);
    const paneel = page.getByTestId('paneel');
    await expect(paneel.getByRole('heading')).toContainText('Zwembad');
    const sport = paneel.getByRole('slider', { name: /Sporthallen, zwembaden/ });
    await sport.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
    await expect(sport).toHaveValue('-50');
    await expect(page.getByTestId('saldo')).toContainText('+ € 12,7 mln');
    await expect(paneel).toContainText('Gesloten');
    await page.screenshot({ path: testInfo.outputPath('paneel.png') });
  });

  test('de lijstweergave werkt met alleen het toetsenbord', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Lijst/ }).click();
    const lijst = page.getByTestId('lijstweergave');
    await expect(lijst).toBeVisible();
    const stadhuis = lijst.locator('summary', { hasText: 'Stadhuis' });
    await stadhuis.focus();
    await page.keyboard.press('Enter');
    const overhead = lijst.getByRole('slider', { name: /Overhead/ });
    await overhead.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(overhead).toHaveValue('-10');
    await expect(page.getByTestId('saldo')).toContainText('+ € 12,3 mln');
  });

  test('met het toetsenbord naar een gebouw op de kaart', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
    await page.locator('[data-gebouw="park"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('paneel').getByRole('heading')).toContainText('Park');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('paneel')).toHaveCount(0);
  });

  test('de kaart blijft vloeiend (beelden per seconde)', async ({ page }, testInfo) => {
    // De eis geldt voor telefoons. In CI rendert de browser zonder GPU; op 1440×900 is dat te traag
    // om iets te zeggen over echte apparaten.
    test.skip(testInfo.project.name === 'desktop', 'fps-meting alleen op telefoonformaat');
    await page.goto('/');
    await expect(page.locator('.kaart-gebouw')).toHaveCount(14);
    const fps = await page.evaluate(
      () =>
        new Promise<number>((klaar) => {
          let n = 0;
          const begin = performance.now();
          const tel = () => {
            n++;
            if (performance.now() - begin < 2000) requestAnimationFrame(tel);
            else klaar((n * 1000) / (performance.now() - begin));
          };
          requestAnimationFrame(tel);
        }),
    );
    testInfo.annotations.push({ type: 'fps', description: fps.toFixed(1) });
    console.log(`fps: ${fps.toFixed(1)}`);
    // Vangnet tegen terugval. De browser in CI rendert zonder GPU (SwiftShader); een telefoon met
    // GPU haalt meer. De 60 fps op een echte middenklasse telefoon moet met de hand worden gemeten.
    expect(fps).toBeGreaterThan(25);
  });
});
