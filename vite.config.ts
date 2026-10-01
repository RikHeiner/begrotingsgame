/// <reference types="vitest/config" />
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
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

export default defineConfig({
  plugins: [
    react(),
    begrotingsData(),
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
        navigateFallbackDenylist: [/^\/data\//],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
