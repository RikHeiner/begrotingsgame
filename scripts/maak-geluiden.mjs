// Maakt korte geluidjes (WAV, mono, 22 kHz) zonder bestanden van derden: npm run geluiden
import { writeFileSync } from 'node:fs';
const RATE = 22050;
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767 * 0.6, i * 2));
  const kop = Buffer.alloc(44);
  kop.write('RIFF', 0);
  kop.writeUInt32LE(36 + data.length, 4);
  kop.write('WAVE', 8);
  kop.write('fmt ', 12);
  kop.writeUInt32LE(16, 16);
  kop.writeUInt16LE(1, 20);
  kop.writeUInt16LE(1, 22);
  kop.writeUInt32LE(RATE, 24);
  kop.writeUInt32LE(RATE * 2, 28);
  kop.writeUInt16LE(2, 32);
  kop.writeUInt16LE(16, 34);
  kop.write('data', 36);
  kop.writeUInt32LE(data.length, 40);
  return Buffer.concat([kop, data]);
}
const toon = (noten, duur, vorm = Math.sin) => {
  const n = Math.floor(RATE * duur);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    const deel = Math.min(noten.length - 1, Math.floor((t / duur) * noten.length));
    const env = Math.exp(-4 * ((t / duur) * noten.length - deel)) * (1 - t / duur);
    return vorm(2 * Math.PI * noten[deel] * t) * env;
  });
};
const ruis = (duur) =>
  Array.from(
    { length: Math.floor(RATE * duur) },
    (_, i) => (Math.random() * 2 - 1) * Math.exp((-i / RATE) * 30),
  );
writeFileSync('public/geluid/munt.wav', wav(toon([988, 1319], 0.25)));
writeFileSync('public/geluid/slot.wav', wav(toon([523, 659, 784], 0.35)));
writeFileSync(
  'public/geluid/fout.wav',
  wav(toon([220, 196], 0.3, (x) => Math.sign(Math.sin(x)) * 0.5)),
);
writeFileSync(
  'public/geluid/hamer.wav',
  wav(
    ruis(0.25).map(
      (s, i) => s + Math.sin((2 * Math.PI * 110 * i) / RATE) * Math.exp((-i / RATE) * 20),
    ),
  ),
);
writeFileSync(
  'public/geluid/bouw.wav',
  wav(toon([392, 392, 330], 0.3, (x) => (2 / Math.PI) * Math.asin(Math.sin(x)))),
);
console.log('geluiden gemaakt');
