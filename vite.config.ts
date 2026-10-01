/// <reference types="vitest/config" />
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

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
    closeBundle() {
      cpSync(DATA_MAP, join(outDir, 'data'), {
        recursive: true,
        filter: (bron) => statSync(bron).isDirectory() || DATA_EXTENSIES.has(extname(bron)),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), begrotingsData()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
});
