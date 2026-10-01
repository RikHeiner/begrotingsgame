/// <reference types="vitest/config" />
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DATA_MAP = resolve(import.meta.dirname, 'data');
const DATA_EXTENSIES = new Set(['.json', '.geojson']);

/**
 * Serveert `data/` als `/data/` tijdens ontwikkelen en kopieert het naar `dist/data/` bij de build.
 * Zo blijft de begrotingsdata los van de code: een nieuw databestand vraagt geen nieuwe build.
 * Alleen .json en .geojson worden gedeeld; documentatie (.md) blijft achter.
 */
function begrotingsData(): Plugin {
  let outDir = 'dist';
  const middleware = (
    req: { url?: string },
    res: { setHeader(k: string, v: string): void; end(body: Buffer): void },
    next: () => void,
  ): void => {
    const pad = decodeURIComponent((req.url ?? '').split('?')[0] ?? '');
    const match = pad.match(/^\/data\/(.+)$/);
    if (!match?.[1]) return next();
    const bestand = normalize(join(DATA_MAP, match[1]));
    if (
      !bestand.startsWith(DATA_MAP + sep) ||
      !DATA_EXTENSIES.has(extname(bestand)) ||
      !existsSync(bestand) ||
      !statSync(bestand).isFile()
    ) {
      return next();
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(readFileSync(bestand));
  };
  return {
    name: 'begrotings-data',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    // writeBundle draait vóór de service worker wordt gemaakt, zodat de data in de offline-cache komt.
    writeBundle() {
      cpSync(DATA_MAP, join(outDir, 'data'), {
        recursive: true,
        filter: (bron) => statSync(bron).isDirectory() || DATA_EXTENSIES.has(extname(bron)),
      });
    },
  };
}

/**
 * Content Security Policy (opdracht 11): alleen code, stijlen, letters en data van de eigen site,
 * plus de database (Supabase) als die is ingesteld. Geen inline scripts.
 */
export function maakCsp(supabaseUrl?: string, metFrames = false): string {
  const database = supabaseUrl ? ` ${new URL(supabaseUrl).origin}` : '';
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${database}`,
    "media-src 'self' data: blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(metFrames ? ["frame-ancestors 'none'"] : []),
  ].join('; ');
}

/**
 * Bij de build: de CSP als meta-tag in elke pagina, het adres van de site in de Open Graph-tags
 * (VITE_SITE_URL), en een bestand _headers met beveiligingsheaders voor de hosting.
 */
function beveiligingEnDelen(): Plugin {
  let bouwen = false;
  let outDir = 'dist';
  let env: Record<string, string> = {};
  return {
    name: 'beveiliging-en-delen',
    configResolved(config) {
      bouwen = config.command === 'build';
      outDir = resolve(config.root, config.build.outDir);
      env = loadEnv(config.mode, config.root, 'VITE_');
    },
    transformIndexHtml(html) {
      const site = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');
      let uit = html.replaceAll('%SITE_URL%', site);
      if (bouwen)
        uit = uit.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${maakCsp(env.VITE_SUPABASE_URL)}" />`,
        );
      return uit;
    },
    writeBundle() {
      // Netlify en Cloudflare Pages lezen dit bestand; bij andere hosting dezelfde headers instellen.
      writeFileSync(
        join(outDir, '_headers'),
        [
          '/*',
          `  Content-Security-Policy: ${maakCsp(env.VITE_SUPABASE_URL, true)}`,
          '  X-Content-Type-Options: nosniff',
          '  Referrer-Policy: strict-origin-when-cross-origin',
          '  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()',
          '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
          '  Cross-Origin-Opener-Policy: same-origin',
          '/dashboard.html',
          '  X-Robots-Tag: noindex, nofollow',
          '/assets/*',
          '  Cache-Control: public, max-age=31536000, immutable',
          '',
        ].join('\n'),
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    begrotingsData(),
    beveiligingEnDelen(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icoon.svg', 'geluid/*.wav'],
      manifest: {
        name: 'Begrotingsgame gemeente Groningen',
        short_name: 'Begrotingsgame',
        description:
          'Maak de begroting van de gemeente Groningen. Een initiatief van de VVD-fractie Groningen-Haren.',
        lang: 'nl',
        start_url: '.',
        display: 'standalone',
        background_color: '#F6F7FC',
        theme_color: '#1233C4',
        icons: [
          { src: 'icoon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icoon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icoon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // De begrotingsdata hoort bij de offline-versie; een nieuwe build ververst haar.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,wav}', 'data/**/*.{json,geojson}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/data\//, /^\/dashboard/],
        // Het dashboard hoort niet bij de offline-versie van de game.
        globIgnores: ['dashboard.html', 'og-afbeelding.png'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Het dashboard is een aparte pagina, zodat de game er niet zwaarder van wordt.
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        toegankelijkheid: resolve(import.meta.dirname, 'toegankelijkheid.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
