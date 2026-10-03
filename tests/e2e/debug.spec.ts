import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('begrotingsgame:tutorial', 'klaar'));
});

test('debugpagina: bezuinigen vult de pot, daarna kan er geïnvesteerd worden', async ({
  page,
}, testInfo) => {
  await page.goto('/#debug');
  const saldoEerste = page.getByTestId('saldo-tabel').getByRole('row', { name: /^2027/ });
  await expect(saldoEerste).toContainText('€ 0,000 mln');

  // Het slot: zonder vrijgemaakt geld kan de OZB niet omlaag.
  await page.getByText('💶 Belastingloket').click();
  const ozb = page.getByLabel(/Onroerendezaakbelasting/);
  await ozb.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('melding')).toContainText('structurele dekking nodig');
  await expect(ozb).toHaveValue('0');

  // Bezuinigen op de overhead (met het toetsenbord) maakt geld vrij.
  await page.getByText('🏛️ Stadhuis').click();
  const overhead = page.getByLabel(/Overhead/);
  await overhead.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(overhead).toHaveValue('-10');
  await expect(saldoEerste).toContainText('+ € 13,150 mln');

  // Nu mag de OZB wel omlaag.
  await ozb.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(ozb).toHaveValue('-5');
  await expect(saldoEerste).toContainText('+ € 6,178 mln');

  await expect(page.getByTestId('effecten')).toContainText('Overhead');
  await page.screenshot({ path: testInfo.outputPath('debug.png'), fullPage: true });
});
