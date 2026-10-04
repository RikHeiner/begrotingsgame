/**
 * Hoofdstation, "Ontwijk de onnodige uitgaven": je fietst vanaf het Hoofdstation over een
 * fietspad met drie stroken naar de Grote Markt. Van boven komen borden met uitgaven die volgens
 * VVD Groningen niet nodig zijn: plannen uit de begroting die je in het Beleidshuis kunt schrappen.
 * Ontwijk ze. Pak munten en geldzakken voor punten, en kerntaken (wat de gemeente van de wet moet
 * doen) voor een extra leven.
 *
 * De rit is een rij van rijen: elke rij heeft drie vakken (links, midden, rechts). In het snelle
 * spel schuiven de rijen naar beneden met een snelheid die oploopt (rustig, druk, spits). In de
 * rustige modus schuift alles één rij op als je kiest: naar links, blijven of naar rechts.
 *
 * Alle bedragen komen uit de begroting van het actieve jaar. Punten en levens zijn spelregels.
 */
import type { Data } from '../engine';
import { bekendePosten, schud } from './minigames';

// -------------------------------------------------------------------------------------------------
// Het veld (beeldpunten; het canvas schaalt mee)
// -------------------------------------------------------------------------------------------------

export const BREEDTE = 360;
export const HOOGTE = 480;
/** Het fietspad loopt van WEG_LINKS tot WEG_RECHTS, met drie stroken. */
export const WEG_LINKS = 72;
export const WEG_RECHTS = 288;
export const STROOK = (WEG_RECHTS - WEG_LINKS) / 3;
/** Het midden van elke strook. */
export const BANEN = [0, 1, 2].map((i) => WEG_LINKS + STROOK * (i + 0.5)) as [
  number,
  number,
  number,
];
/** Hier fietst de speler (van boven gemeten). */
export const SPELER_Y = 372;

/** Het snelle spel duurt zo lang (seconden). */
export const DUUR = 60;
/** Zoveel beurten in de rustige modus. */
export const BEURTEN = 20;
/** Afstand tussen twee rijen op het scherm in de rustige modus. */
export const RIJ_STIL = 112;
/** Zoveel levens heb je. */
export const LEVENS = 3;

/** Spelregels: zoveel punten per ding. */
export const PUNTEN = { ontweken: 10, munt: 5, zak: 15, kern: 10 } as const;

export type Fase = {
  naam: string;
  uitleg: string;
  /** vanaf deze seconde (snel spel) */
  van: number;
  /** afstand tussen de rijen in het snelle spel (beeldpunten) */
  afstand: number;
  /** kans op twee uitgaven in één rij, en op ten minste één */
  twee: number;
  een: number;
};

export const FASES: readonly [Fase, Fase, Fase] = [
  {
    naam: 'Rustig',
    uitleg: 'Het is nog rustig op het fietspad.',
    van: 0,
    afstand: 330,
    twee: 0,
    een: 0.75,
  },
  {
    naam: 'Druk',
    uitleg: 'Het wordt drukker: soms twee uitgaven naast elkaar.',
    van: 20,
    afstand: 290,
    twee: 0.35,
    een: 0.9,
  },
  {
    naam: 'Spits',
    uitleg: 'Spits! Alles gaat sneller en de uitgaven komen vaker.',
    van: 40,
    afstand: 255,
    twee: 0.6,
    een: 1,
  },
];

/** Snelheid (beeldpunten per seconde) op tijd t: loopt op van 190 naar 382. */
export const snelheid = (t: number): number => 190 + 3.2 * Math.max(0, t);
/** Afstand die je hebt afgelegd op tijd t (de som van de snelheid). */
export const afstand = (t: number): number => 190 * t + 1.6 * t * t;
/** Op welke tijd je op afstand w bent (het omgekeerde van `afstand`). */
export const tijdBij = (w: number): number => (-190 + Math.sqrt(190 * 190 + 6.4 * w)) / 3.2;

/** Fase 0, 1 of 2 op tijd t (snel spel). */
export function faseOp(t: number): number {
  let f = 0;
  FASES.forEach((x, i) => {
    if (t >= x.van) f = i;
  });
  return f;
}

/** Fase 0, 1 of 2 bij beurt `nr` (rustige modus; 0 is de eerste rij). */
export const faseBijBeurt = (nr: number, beurten = BEURTEN): number =>
  Math.min(2, Math.floor((nr / beurten) * 3));

// -------------------------------------------------------------------------------------------------
// De uitgaven en kerntaken, uit de begroting
// -------------------------------------------------------------------------------------------------

export type Uitgave = {
  id: string;
  /** korte naam van de uitgave, zoals "Young Professional Programma" */
  naam: string;
  /** de naam van de keuze in het Beleidshuis, zoals "Stoppen met het Young Professional Programma" */
  keuze: string;
  /** wat het is of wat er gebeurt als het stopt */
  uitleg: string;
  bedragMln: number;
  /** elk jaar (S) of eenmalig (I) */
  soort: 'S' | 'I';
  /** jaar van de begroting waar het bedrag uit komt */
  jaar: number;
  /** een zin uit het verkiezingsprogramma van VVD Groningen, als die er is */
  vvd?: string;
  pagina?: number;
};

export type Kerntaak = {
  id: string;
  naam: string;
  uitleg: string;
  bedragMln: number;
  wet?: string;
};

const HOOFDLETTER = (s: string): string => {
  const i = s.search(/[A-Za-zÀ-ÿ]/);
  return i < 0 ? s : s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1);
};

/**
 * Maakt van een keuze ("Stoppen met het Energiebedrijf Groningen") de naam van de uitgave
 * ("Energiebedrijf Groningen"). Geen uitgave (zoals meer huur vragen of een doel uitstellen):
 * undefined.
 */
export function korteNaam(keuze: string): string | undefined {
  const s = keuze
    .replace(/, naar .*$/i, '')
    .replace(/['‘’"]/g, '')
    .replace(/ meer voor /i, ' voor ')
    .trim();
  const voor: [RegExp, string][] = [
    [/^stoppen met (subsidie )/i, 'subsidie '],
    [/^stoppen met (het |de )?/i, ''],
    [/^geen geld voor /i, ''],
    [/^geen extra /i, 'extra '],
    [/^geen /i, ''],
    [/^niet meer betalen voor /i, ''],
    [/^niet meer /i, ''],
    [/^schrappen /i, ''],
    [/^pauze /i, ''],
  ];
  for (const [patroon, vervang] of voor)
    if (patroon.test(s)) return HOOFDLETTER(s.replace(patroon, vervang).trim());
  const na: [RegExp, string][] = [
    [/ niet uitbreiden$/i, ' uitbreiden'],
    [/ niet bouwen$/i, ' bouwen'],
    [/ stoppen$/i, ''],
    [/ uitstellen$/i, ''],
  ];
  for (const [patroon, vervang] of na)
    if (patroon.test(s)) return HOOFDLETTER(s.replace(patroon, vervang).trim());
  return undefined;
}

/**
 * De onnodige uitgaven: de plannen uit het Beleidshuis (programma's en kaarten met een id die met
 * p_ begint) en de plannen uit de Geldzoeker met een zin uit het verkiezingsprogramma. Met de
 * bedragen uit de begroting van het actieve jaar. Plannen met een zin uit het programma eerst.
 */
export function uitgaven(data: Data): Uitgave[] {
  const jaar = data.begroting.begrotingsjaar;
  const citaten = new Map(
    (data.minigames.find((m) => m.goud)?.goud?.schatten ?? []).map((s) => [s.kaart, s]),
  );
  const uit: Uitgave[] = [];
  const voegToe = (
    id: string,
    keuze: string,
    uitleg: string,
    bedragMln: number,
    soort: 'S' | 'I',
  ) => {
    const naam = korteNaam(keuze);
    if (!naam || !(bedragMln > 0)) return;
    if (uit.some((u) => u.id === id || u.naam.toLowerCase() === naam.toLowerCase())) return;
    const c = citaten.get(id);
    uit.push({
      id,
      naam,
      keuze,
      uitleg,
      bedragMln,
      soort,
      jaar,
      ...(c ? { vvd: c.vvd, pagina: c.pagina } : {}),
    });
  };
  for (const k of data.begroting.actiekaarten)
    if ((k.id.startsWith('p_') || citaten.has(k.id)) && !k.groep && !k.verkoop)
      voegToe(k.id, k.naam, k.uitleg, k.bedrag_mln, k.structureel_of_incidenteel);
  for (const p of data.index.programmas.values())
    voegToe(p.id, p.naam, p.wat ?? p.uitleg, p.bedrag_mln, p.structureel_of_incidenteel);
  return [...uit.filter((u) => u.vvd), ...uit.filter((u) => !u.vvd)];
}

/** Deze kerntaak komt als eerste, de rest daarna. */
const EERSTE_KERN = 'Brandweer en ambulance';

/**
 * Kerntaken: wat de gemeente van de wet moet doen (minstens € 5 mln), met het bedrag uit de
 * begroting. Brandweer en ambulance eerst.
 */
export function kerntaken(data: Data): Kerntaak[] {
  return bekendePosten(data)
    .filter((p) => p.soort === 'wet' && p.bedragMln >= 5)
    .sort((a, b) => Number(b.naam === EERSTE_KERN) - Number(a.naam === EERSTE_KERN))
    .map((p) => ({
      id: p.id,
      naam: p.naam,
      uitleg: p.uitleg,
      bedragMln: p.bedragMln,
      ...(p.wet ? { wet: p.wet } : {}),
    }));
}

// -------------------------------------------------------------------------------------------------
// De rit
// -------------------------------------------------------------------------------------------------

export type Vak =
  | { soort: 'uitgave'; uitgave: Uitgave }
  | { soort: 'munt' }
  | { soort: 'zak' }
  | { soort: 'kern'; kern: Kerntaak };

export type Rij = {
  nr: number;
  fase: number;
  /** plek op de route (beeldpunten vanaf de start; snel spel) */
  w: number;
  vakken: [Vak | null, Vak | null, Vak | null];
};

export type Rit = { rijen: Rij[]; stil: boolean; lengte: number };

/** Waar de eerste rij ligt in het snelle spel: zo heb je even tijd om weg te fietsen. */
export const EERSTE_RIJ = 560;

const buren = (banen: ReadonlySet<number>): Set<number> => {
  const uit = new Set<number>();
  for (const b of banen) for (const d of [-1, 0, 1]) if (b + d >= 0 && b + d <= 2) uit.add(b + d);
  return uit;
};

/**
 * Maakt de rit: in het snelle spel rijen tot het eind van de tijd, in de rustige modus `BEURTEN`
 * rijen. Er is altijd een weg zonder uitgaven, ook als je per rij maar één strook opschuift.
 */
export function maakRit(
  data: Data,
  stil: boolean,
  kans: () => number = Math.random,
  beurten = BEURTEN,
): Rit {
  const lijst = uitgaven(data);
  // eerst de plannen met een zin uit het programma (in willekeurige volgorde), dan de rest
  const metZin = schud(
    lijst.filter((u) => u.vvd),
    kans,
  );
  const rest = schud(
    lijst.filter((u) => !u.vvd),
    kans,
  );
  let stapel = [...metZin, ...rest];
  const volgende = (): Uitgave => {
    if (!stapel.length) stapel = schud(lijst, kans);
    return stapel.shift() as Uitgave;
  };
  const [eerste, ...andere] = kerntaken(data);
  const kern = eerste ? [eerste, ...schud(andere, kans)] : [];
  const kernGehad = new Set<number>();

  // de plekken van de rijen
  const plekken: { w: number; fase: number }[] = [];
  if (stil) {
    for (let i = 0; i < beurten; i++) plekken.push({ w: i, fase: faseBijBeurt(i, beurten) });
  } else {
    const eind = afstand(DUUR) - 160;
    for (let w = EERSTE_RIJ; w < eind;) {
      const fase = faseOp(tijdBij(w));
      plekken.push({ w, fase });
      w += FASES[fase]?.afstand ?? 300;
    }
  }

  let veilig = new Set([1]);
  const rijen: Rij[] = plekken.map(({ w, fase }, nr) => {
    const f = FASES[fase] ?? FASES[0];
    const bereik = buren(veilig);
    const r = kans();
    const aantal = nr === 0 ? 1 : r < f.twee ? 2 : r < f.een ? 1 : 0;
    const banen = schud([0, 1, 2], kans).slice(0, aantal);
    // er moet een bereikbare strook vrij blijven
    if ([...bereik].every((b) => banen.includes(b))) {
      const weg = [...bereik][Math.floor(kans() * bereik.size)];
      banen.splice(banen.indexOf(weg as number), 1);
    }
    const vakken: [Vak | null, Vak | null, Vak | null] = [null, null, null];
    for (const b of banen) vakken[b] = { soort: 'uitgave', uitgave: volgende() };
    for (let b = 0; b < 3; b++) {
      if (vakken[b]) continue;
      const k = kans();
      if (k < 0.07 && !kernGehad.has(fase) && kern.length) {
        kernGehad.add(fase);
        vakken[b] = { soort: 'kern', kern: kern[fase % kern.length] as Kerntaak };
      } else if (k < 0.16) vakken[b] = { soort: 'zak' };
      else if (k < 0.62) vakken[b] = { soort: 'munt' };
    }
    veilig = new Set([...bereik].filter((b) => !banen.includes(b)));
    return { nr, fase, w, vakken };
  });
  const lengte = stil ? beurten : afstand(DUUR);
  return { rijen, stil, lengte };
}

/** Kan iemand de hele rit zonder botsen rijden, met één strook opzij per rij? */
export function vrijeWeg(rit: Rit, begin = 1): boolean {
  let mogelijk = new Set([begin]);
  for (const rij of rit.rijen) {
    mogelijk = new Set([...buren(mogelijk)].filter((b) => rij.vakken[b]?.soort !== 'uitgave'));
    if (!mogelijk.size) return false;
  }
  return true;
}

/** De hoogst mogelijke score: alle uitgaven ontweken en per rij het beste vak gepakt. */
export function maxPunten(rit: Rit): number {
  return rit.rijen.reduce((som, rij) => {
    const ontwijk = rij.vakken.filter((v) => v?.soort === 'uitgave').length * PUNTEN.ontweken;
    const beste = Math.max(
      0,
      ...rij.vakken.map((v) => (v && v.soort !== 'uitgave' ? PUNTEN[v.soort] : 0)),
    );
    return som + ontwijk + beste;
  }, 0);
}

// -------------------------------------------------------------------------------------------------
// Spelen
// -------------------------------------------------------------------------------------------------

export type Stand = {
  levens: number;
  punten: number;
  munten: number;
  zakken: number;
  /** uitgaven die je ontweek (elk één keer) */
  ontweken: Uitgave[];
  /** uitgaven die je raakte (elk één keer) */
  geraakt: Uitgave[];
  kern: Kerntaak[];
  /** zoveel rijen ben je voorbij */
  rij: number;
};

export const nieuweStand = (): Stand => ({
  levens: LEVENS,
  punten: 0,
  munten: 0,
  zakken: 0,
  ontweken: [],
  geraakt: [],
  kern: [],
  rij: 0,
});

export type Gebeurtenis =
  | { soort: 'geraakt'; uitgave: Uitgave }
  | { soort: 'ontweken'; uitgave: Uitgave }
  | { soort: 'munt' }
  | { soort: 'zak' }
  | { soort: 'kern'; kern: Kerntaak; leven: boolean };

/** Naar een andere strook: -1 is links, 1 is rechts. Blijft binnen het fietspad. */
export const zet = (baan: number, richting: number): number =>
  Math.max(0, Math.min(2, baan + Math.sign(richting)));

/** De strook die het dichtst bij x ligt. */
export const baanBij = (x: number): number =>
  Math.max(0, Math.min(2, Math.floor((x - WEG_LINKS) / STROOK)));

/** Je fietst in strook `baan` langs rij `rij`: wat gebeurt er? */
export function passeer(
  stand: Stand,
  rij: Rij,
  baan: number,
): { stand: Stand; gebeurtenissen: Gebeurtenis[] } {
  if (stand.levens <= 0) return { stand, gebeurtenissen: [] };
  const s: Stand = {
    ...stand,
    ontweken: [...stand.ontweken],
    geraakt: [...stand.geraakt],
    kern: [...stand.kern],
    rij: stand.rij + 1,
  };
  const uit: Gebeurtenis[] = [];
  rij.vakken.forEach((v, b) => {
    if (!v) return;
    if (v.soort === 'uitgave') {
      if (b === baan) {
        s.levens -= 1;
        if (!s.geraakt.some((u) => u.id === v.uitgave.id)) s.geraakt.push(v.uitgave);
        uit.push({ soort: 'geraakt', uitgave: v.uitgave });
      } else {
        s.punten += PUNTEN.ontweken;
        if (!s.ontweken.some((u) => u.id === v.uitgave.id)) s.ontweken.push(v.uitgave);
        uit.push({ soort: 'ontweken', uitgave: v.uitgave });
      }
    } else if (b === baan) {
      if (v.soort === 'munt') {
        s.punten += PUNTEN.munt;
        s.munten += 1;
        uit.push({ soort: 'munt' });
      } else if (v.soort === 'zak') {
        s.punten += PUNTEN.zak;
        s.zakken += 1;
        uit.push({ soort: 'zak' });
      } else {
        const leven = s.levens < LEVENS;
        if (leven) s.levens += 1;
        else s.punten += PUNTEN.kern;
        if (!s.kern.some((k) => k.id === v.kern.id)) s.kern.push(v.kern);
        uit.push({ soort: 'kern', kern: v.kern, leven });
      }
    }
  });
  return { stand: s, gebeurtenissen: uit };
}

/**
 * Wat de gemeente niet uitgeeft aan de uitgaven die je ontweek (en niet raakte): elk jaar en
 * eenmalig apart, want die kun je niet zomaar optellen.
 */
export function bespaard(stand: Stand): { elkJaar: number; eenmalig: number } {
  const geraakt = new Set(stand.geraakt.map((u) => u.id));
  let elkJaar = 0;
  let eenmalig = 0;
  for (const u of stand.ontweken) {
    if (geraakt.has(u.id)) continue;
    if (u.soort === 'S') elkJaar += u.bedragMln;
    else eenmalig += u.bedragMln;
  }
  return { elkJaar, eenmalig };
}

/** Een korte beschrijving van een rij, voor wie het scherm niet ziet. */
export function beschrijfRij(rij: Rij | undefined): string {
  if (!rij) return 'Vrije baan tot de finish.';
  const kant = ['links', 'midden', 'rechts'];
  return rij.vakken
    .map((v, b) => {
      const k = kant[b];
      if (!v) return `${k} vrij`;
      if (v.soort === 'uitgave') return `${k} een onnodige uitgave: ${v.uitgave.naam}`;
      if (v.soort === 'munt') return `${k} een munt`;
      if (v.soort === 'zak') return `${k} een geldzak`;
      return `${k} een kerntaak: ${v.kern.naam}`;
    })
    .join(', ');
}

/** Korte code van een rij voor tests: U = uitgave, M = munt, Z = zak, K = kerntaak, . = vrij. */
export const rijCode = (rij: Rij | undefined): string =>
  rij
    ? rij.vakken
        .map((v) =>
          !v
            ? '.'
            : v.soort === 'uitgave'
              ? 'U'
              : v.soort === 'munt'
                ? 'M'
                : v.soort === 'zak'
                  ? 'Z'
                  : 'K',
        )
        .join('')
    : '...';
