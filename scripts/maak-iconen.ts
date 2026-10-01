/** Maakt de PNG-iconen voor de PWA uit public/icoon.svg (npm run iconen). */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const lokaal = '/opt/pw-browsers/chromium';
const svg = readFileSync(resolve(import.meta.dirname, '../public/icoon.svg'), 'utf8');
const browser = await chromium.launch(existsSync(lokaal) ? { executablePath: lokaal } : {});
const page = await browser.newPage();
for (const [naam, maat, marge] of [
  ['icoon-192.png', 192, 0],
  ['icoon-512.png', 512, 0],
  ['icoon-maskable-512.png', 512, 0.12],
] as const) {
  await page.setViewportSize({ width: maat, height: maat });
  const binnen = maat * (1 - 2 * marge);
  await page.setContent(
    `<html><body style="margin:0;background:#1233C4;display:grid;place-items:center;height:${maat}px">` +
      `<div style="width:${binnen}px;height:${binnen}px">${svg.replace('<svg ', `<svg width="${binnen}" height="${binnen}" `)}</div></body></html>`,
  );
  await page.screenshot({
    path: resolve(import.meta.dirname, `../public/${naam}`),
    omitBackground: false,
  });
}
await browser.close();
console.log('iconen gemaakt');
