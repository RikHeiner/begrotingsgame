/**
 * Oostersluis: de sluiswachter. Het water in de sluiskolk is het saldo van de begroting (spelregel:
 * 1 streep = € 1 mln). Over het Winschoterdiep varen schepen aan. Een groen schip brengt geld in
 * (bijvoorbeeld meer geld van het Rijk), een rood schip haalt geld weg (bijvoorbeeld jeugdzorg die
 * duurder wordt). Jij houdt het peil binnen de veilige band: bezuinigen op een eigen keuze, de OZB
 * een beetje omhoog of omlaag, of geld uit de reserve.
 *
 * Wat er met een schip gebeurt, is een voorbeeld (⚠︎ aanname). Het bedrag waar het op rekent, komt
 * uit de begroting van het actieve jaar; het percentage is een spelregel. Hier staan de regels en
 * het rekenwerk; het scherm staat in src/ui/minigames/Sluis.tsx.
 */
import type { Data } from '../engine';
import { bekendePosten, schud, type BekendePost } from './minigames';

// Het speelveld in beeldpunten (het canvas schaalt mee).
export const BREEDTE = 480;
export const HOOGTE = 360;

/** Binnen deze band is het peil veilig (spelregel, in mln). */
export const VEILIG = 6;
/** Hoger of lager kan het water niet: de rand van de kolk (in mln). */
export const WAND = 12;
/** Bezuinigen haalt dit deel van een post weg (spelregel). */
export const BEZUINIG_PCT = 15;
/** De OZB een beetje omhoog of omlaag: zoveel procent van de opbrengst (spelregel). */
export const OZB_PCT = 2;
/** Zo vaak mag de OZB omhoog in een level (spelregel). */
export const OZB_KEER = 3;
/** Zoveel geld haal je in één keer uit de reserve (spelregel, in mln). */
export const RESERVE_MLN = 5;
/** Zo vaak mag je in het hele spel geld uit de reserve halen (spelregel). */
export const RESERVE_KEER = 3;
/** Levens per level. */
export const LEVENS = 3;
/** Een schip mag hooguit dit deel van een bedrag uit de begroting veranderen (spelregel). */
export const MAX_PCT = 15;

/** Seconden: zo lang vaart een schip naar het midden van de kolk. */
export const AANVAAR = 3.5;
/** Seconden: zo lang ligt een schip in de kolk; daarna kijkt de sluiswachter naar het peil. */
export const WACHT = 2.5;
/** Seconden: zo lang vaart een schip de sluis uit. */
export const UITVAAR = 2.5;
/** Seconden voor het eerste schip. */
export const AANLOOP = 1;

export const LEVELS = [
  {
    naam: 'Rustig vaarwater',
    uitleg: 'Kleine schepen, en tijd genoeg om te kijken.',
    tempo: 8,
    schepen: 8,
    minMln: 1,
    maxMln: 3,
    rood: 0.55,
  },
  {
    naam: 'Druk op het Winschoterdiep',
    uitleg: 'Meer schepen, en ze zijn groter.',
    tempo: 7,
    schepen: 9,
    minMln: 1.5,
    maxMln: 4.5,
    rood: 0.55,
  },
  {
    naam: 'Storm',
    uitleg: 'De grootste schepen, vlak na elkaar.',
    tempo: 6,
    schepen: 10,
    minMln: 2.5,
    maxMln: 6,
    rood: 0.6,
  },
] as const;

export const rond = (x: number): number => Math.round(x * 10) / 10;

// -------------------------------------------------------------------------------------------------
// Schepen
// -------------------------------------------------------------------------------------------------

export type Schip = {
  id: string;
  /** groen: er komt geld bij; rood: er gaat geld uit */
  kleur: 'groen' | 'rood';
  /** wat er gebeurt */
  tekst: string;
  /** korte naam op het schip */
  kort: string;
  /** waar het bedrag op rekent: een post, een belasting of het geld van het Rijk */
  bron: 'post' | 'belasting' | 'rijk';
  /** de begrijpelijke naam van die post of belasting */
  naam: string;
  /** korte uitleg bij de post */
  uitleg?: string;
  /** de post moet van de wet: welke wet */
  wet?: string;
  /** het bedrag uit de begroting, in mln */
  basisMln: number;
  /** procent daarvan (spelregel), altijd positief */
  pct: number;
  /** de verandering van het peil (mln): positief bij groen, negatief bij rood */
  bedragMln: number;
};

type Recept = {
  kleur: 'groen' | 'rood';
  bron: 'post' | 'belasting' | 'rijk';
  /** id van de post of belasting */
  ref?: string;
  tekst: string;
  kort: string;
};

/** Wat er kan gebeuren (⚠︎ voorbeelden; de bedragen komen uit de begroting). */
export const RECEPTEN: readonly Recept[] = [
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'z1',
    tekst: 'Meer kinderen hebben jeugdzorg nodig',
    kort: 'Jeugdzorg',
  },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 's1',
    tekst: 'Meer mensen hebben een bijstandsuitkering',
    kort: 'Bijstand',
  },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'z3',
    tekst: 'Meer mensen hebben hulp in huis nodig',
    kort: 'Hulp in huis',
  },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'z2',
    tekst: 'Beschermd wonen wordt duurder',
    kort: 'Beschermd wonen',
  },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'o1',
    tekst: 'Straten en groen hebben extra onderhoud nodig',
    kort: 'Straten',
  },
  { kleur: 'rood', bron: 'post', ref: 'o3', tekst: 'Afval verwerken wordt duurder', kort: 'Afval' },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'v1',
    tekst: 'Brandweer en ambulance worden duurder',
    kort: 'Brandweer',
  },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'z5',
    tekst: 'Meer mensen hebben opvang nodig',
    kort: 'Opvang',
  },
  {
    kleur: 'rood',
    bron: 'post',
    ref: 'h1',
    tekst: 'De lonen bij de gemeente gaan omhoog',
    kort: 'Lonen',
  },
  { kleur: 'rood', bron: 'rijk', tekst: 'Minder geld van het Rijk', kort: 'Rijk' },
  {
    kleur: 'rood',
    bron: 'belasting',
    ref: 't5',
    tekst: 'Parkeren brengt minder op dan verwacht',
    kort: 'Parkeren',
  },
  { kleur: 'groen', bron: 'rijk', tekst: 'Meer geld van het Rijk', kort: 'Rijk' },
  {
    kleur: 'groen',
    bron: 'belasting',
    ref: 't1',
    tekst: 'Er zijn nieuwe woningen: de OZB brengt meer op',
    kort: 'OZB',
  },
  {
    kleur: 'groen',
    bron: 'belasting',
    ref: 't5',
    tekst: 'Parkeren brengt meer op dan verwacht',
    kort: 'Parkeren',
  },
  {
    kleur: 'groen',
    bron: 'post',
    ref: 's1',
    tekst: 'Minder mensen in de bijstand: dat scheelt geld',
    kort: 'Bijstand',
  },
  {
    kleur: 'groen',
    bron: 'post',
    ref: 'o3',
    tekst: 'Afval verwerken wordt goedkoper',
    kort: 'Afval',
  },
  {
    kleur: 'groen',
    bron: 'post',
    ref: 'z1',
    tekst: 'Jeugdzorg kost minder dan verwacht',
    kort: 'Jeugdzorg',
  },
];

/** De naam waaronder het geld van het Rijk in het spel staat. */
export const RIJK_NAAM = 'Geld van het Rijk (gemeentefonds)';

type Bron = Pick<Schip, 'naam' | 'uitleg' | 'wet' | 'basisMln'>;

/** Zoekt het bedrag en de begrijpelijke naam bij een recept. Niet gevonden: undefined. */
function bronVan(data: Data, posten: BekendePost[], r: Recept): Bron | undefined {
  if (r.bron === 'rijk')
    return {
      naam: RIJK_NAAM,
      uitleg: 'Het grootste deel van het geld van de gemeente komt van het Rijk.',
      basisMln: data.kengetallen.gemeentefonds_x1000 / 1000,
    };
  if (r.bron === 'belasting') {
    const b = data.begroting.belastingen.find((x) => x.id === r.ref);
    if (!b) return undefined;
    return {
      naam: b.id === 't1' ? 'OZB (belasting op huizen en gebouwen)' : b.naam,
      uitleg: b.uitleg,
      basisMln: b.opbrengst_mln,
    };
  }
  const p = posten.find((x) => x.id === r.ref);
  if (!p) return undefined;
  return {
    naam: p.naam,
    uitleg: p.uitleg,
    ...(p.soort === 'wet' && p.wet ? { wet: p.wet } : {}),
    basisMln: p.bedragMln,
  };
}

/**
 * Maakt een schip: het bedrag ligt ongeveer op `doelMln`, als een rond percentage van het bedrag
 * uit de begroting (hooguit MAX_PCT). Kan dat niet boven `minMln` uitkomen, dan geen schip.
 */
export function maakSchip(
  r: Recept,
  bron: Bron,
  doelMln: number,
  minMln: number,
  id: string,
): Schip | undefined {
  if (!(bron.basisMln > 0)) return undefined;
  const pct = Math.min(MAX_PCT, Math.max(0.1, rond((doelMln / bron.basisMln) * 100)));
  const bedrag = rond((bron.basisMln * pct) / 100);
  if (bedrag < minMln - 0.05 || bedrag <= 0) return undefined;
  return {
    id,
    kleur: r.kleur,
    tekst: r.tekst,
    kort: r.kort,
    bron: r.bron,
    ...bron,
    pct,
    bedragMln: r.kleur === 'groen' ? bedrag : -bedrag,
  };
}

/** De schepen van level `nr` (1, 2 of 3): een mix van groen en rood, elk recept hooguit één keer. */
export function maakSchepen(data: Data, nr: number, kans: () => number = Math.random): Schip[] {
  const l = levelInstelling(nr);
  const posten = bekendePosten(data);
  const over = schud(RECEPTEN, kans);
  const uit: Schip[] = [];
  for (let i = 0; i < l.schepen && over.length; i++) {
    const kleur = kans() < l.rood ? 'rood' : 'groen';
    // eerst een recept van de gekozen kleur, anders van de andere kleur
    const volgorde = [
      ...over.filter((r) => r.kleur === kleur),
      ...over.filter((r) => r.kleur !== kleur),
    ];
    for (const r of volgorde) {
      const bron = bronVan(data, posten, r);
      const doel = l.minMln + kans() * (l.maxMln - l.minMln);
      const schip = bron && maakSchip(r, bron, doel, l.minMln, `l${nr}-s${i}`);
      over.splice(over.indexOf(r), 1);
      if (schip) {
        uit.push(schip);
        break;
      }
    }
  }
  return uit;
}

export function levelInstelling(nr: number): (typeof LEVELS)[number] {
  return LEVELS[Math.min(LEVELS.length, Math.max(1, nr)) - 1] ?? LEVELS[0];
}

/** Hoe lang een level duurt (seconden), als de klok loopt. */
export function levelDuur(nr: number, schepen: number): number {
  const l = levelInstelling(nr);
  return AANLOOP + Math.max(0, schepen - 1) * l.tempo + AANVAAR + WACHT;
}

/** Wanneer schip `i` begint aan te varen (seconden sinds het begin van het level). */
export const vertrek = (nr: number, i: number): number => AANLOOP + i * levelInstelling(nr).tempo;

/** Waar een schip is, `t` seconden nadat het begon aan te varen. */
export function schipFase(t: number): { fase: 'weg' | 'aan' | 'kolk' | 'uit'; f: number } {
  if (t < 0) return { fase: 'weg', f: 0 };
  if (t < AANVAAR) return { fase: 'aan', f: t / AANVAAR };
  if (t < AANVAAR + WACHT) return { fase: 'kolk', f: (t - AANVAAR) / WACHT };
  if (t < AANVAAR + WACHT + UITVAAR) return { fase: 'uit', f: (t - AANVAAR - WACHT) / UITVAAR };
  return { fase: 'weg', f: 1 };
}

// -------------------------------------------------------------------------------------------------
// Wat jij kunt doen
// -------------------------------------------------------------------------------------------------

/** Een eigen keuze waar je op kunt bezuinigen, met wat dat oplevert. */
export type Bezuiniging = { post: BekendePost; bedragMln: number };

/** Posten die een eigen keuze zijn (soort 'keuze'), de grootste eerst, met wat bezuinigen oplevert. */
export function bezuinigOpties(data: Data): Bezuiniging[] {
  return bekendePosten(data)
    .filter((p) => p.soort === 'keuze')
    .map((post) => ({ post, bedragMln: rond((post.bedragMln * BEZUINIG_PCT) / 100) }))
    .filter((b) => b.bedragMln > 0)
    .sort((a, b) => b.bedragMln - a.bedragMln);
}

/** Wat de OZB een beetje omhoog (of omlaag) oplevert, in mln. */
export function ozbStap(data: Data): number {
  const ozb =
    data.begroting.belastingen.find((b) => b.id === 't1')?.opbrengst_mln ??
    data.kengetallen.ozb_x1000 / 1000;
  return rond((ozb * OZB_PCT) / 100);
}

/** De algemene reserve (de spaarpot van de gemeente), in mln. */
export const algemeneReserve = (data: Data): number =>
  data.kengetallen.algemene_reserve_x1000 / 1000;

// -------------------------------------------------------------------------------------------------
// De stand en de stappen (een reducer: elke actie geeft een nieuwe stand)
// -------------------------------------------------------------------------------------------------

/** Wat er net gebeurde, voor de melding en het geluid van het spel. */
export type Gebeurd =
  | { soort: 'aankomst'; schip: Schip }
  | { soort: 'veilig'; schip: Schip; peil: number }
  | { soort: 'alarm'; schip: Schip; peil: number; richting: 'hoog' | 'laag' }
  | { soort: 'bezuinig'; post: BekendePost; bedragMln: number }
  | { soort: 'ozb'; bedragMln: number }
  | { soort: 'reserve'; bedragMln: number }
  | { soort: 'wet'; post: BekendePost }
  | { soort: 'kan-niet'; reden: 'ozb' | 'reserve' | 'al-bezuinigd' | 'vol' | 'leeg' };

export type Stand = {
  /** het saldo in mln (1 streep = € 1 mln), tussen −WAND en +WAND */
  peil: number;
  levens: number;
  /** schepen die veilig door de sluis gingen */
  veilig: number;
  /** schepen die al door de sluis gingen (veilig of niet) */
  klaar: number;
  /** het schip in de kolk */
  inKolk?: Schip;
  /** zo vaak ging de OZB omhoog in dit level */
  ozbOmhoog: number;
  /** de OZB in procent ten opzichte van de begroting (+2, −2, …) */
  ozbPct: number;
  /** zo vaak kun je nog geld uit de reserve halen (het hele spel) */
  reserveOver: number;
  /** posten waarop je in dit level bezuinigde */
  bezuinigd: Bezuiniging[];
  /** zo vaak liep het peil uit de band */
  alarmen: number;
  /** wat er net gebeurde, met een volgnummer zodat een melding steeds opnieuw verschijnt */
  gebeurd?: Gebeurd;
  nr: number;
};

export type Actie =
  | { soort: 'aankomst'; schip: Schip }
  | { soort: 'controle' }
  | { soort: 'bezuinig'; optie: Bezuiniging }
  | { soort: 'ozb'; richting: 1 | -1; stapMln: number }
  | { soort: 'reserve' }
  | { soort: 'wet'; post: BekendePost }
  | { soort: 'nieuw'; reserveOver: number };

export const beginStand = (reserveOver = RESERVE_KEER): Stand => ({
  peil: 0,
  levens: LEVENS,
  veilig: 0,
  klaar: 0,
  ozbOmhoog: 0,
  ozbPct: 0,
  reserveOver,
  bezuinigd: [],
  alarmen: 0,
  nr: 0,
});

/** Het nieuwe peil, tussen de wanden van de kolk. */
export function nieuwPeil(peil: number, verandering: number): number {
  return rond(Math.max(-WAND, Math.min(WAND, peil + verandering)));
}

export function isVeilig(peil: number): boolean {
  return Math.abs(peil) <= VEILIG + 1e-9;
}

export function stap(s: Stand, a: Actie): Stand {
  const nr = s.nr + 1;
  switch (a.soort) {
    case 'nieuw':
      return { ...beginStand(a.reserveOver), nr };
    case 'aankomst':
      return {
        ...s,
        inKolk: a.schip,
        peil: nieuwPeil(s.peil, a.schip.bedragMln),
        gebeurd: { soort: 'aankomst', schip: a.schip },
        nr,
      };
    case 'controle': {
      const schip = s.inKolk;
      if (!schip) return s;
      const basis = { ...s, inKolk: undefined, klaar: s.klaar + 1, nr };
      if (isVeilig(s.peil))
        return {
          ...basis,
          veilig: s.veilig + 1,
          gebeurd: { soort: 'veilig', schip, peil: s.peil },
        };
      // Buiten de band: alarm. Je verliest een leven en het peil gaat terug naar 0 (spelregel).
      return {
        ...basis,
        peil: 0,
        levens: Math.max(0, s.levens - 1),
        alarmen: s.alarmen + 1,
        gebeurd: { soort: 'alarm', schip, peil: s.peil, richting: s.peil > 0 ? 'hoog' : 'laag' },
      };
    }
    case 'bezuinig': {
      if (s.bezuinigd.some((b) => b.post.id === a.optie.post.id))
        return { ...s, gebeurd: { soort: 'kan-niet', reden: 'al-bezuinigd' }, nr };
      if (s.peil >= WAND) return { ...s, gebeurd: { soort: 'kan-niet', reden: 'vol' }, nr };
      return {
        ...s,
        peil: nieuwPeil(s.peil, a.optie.bedragMln),
        bezuinigd: [...s.bezuinigd, a.optie],
        gebeurd: { soort: 'bezuinig', post: a.optie.post, bedragMln: a.optie.bedragMln },
        nr,
      };
    }
    case 'ozb': {
      if (a.richting > 0 && s.ozbOmhoog >= OZB_KEER)
        return { ...s, gebeurd: { soort: 'kan-niet', reden: 'ozb' }, nr };
      if (a.richting > 0 && s.peil >= WAND)
        return { ...s, gebeurd: { soort: 'kan-niet', reden: 'vol' }, nr };
      if (a.richting < 0 && s.peil <= -WAND)
        return { ...s, gebeurd: { soort: 'kan-niet', reden: 'leeg' }, nr };
      const bedrag = a.richting * a.stapMln;
      return {
        ...s,
        peil: nieuwPeil(s.peil, bedrag),
        ozbOmhoog: s.ozbOmhoog + (a.richting > 0 ? 1 : 0),
        ozbPct: s.ozbPct + a.richting * OZB_PCT,
        gebeurd: { soort: 'ozb', bedragMln: bedrag },
        nr,
      };
    }
    case 'reserve': {
      if (s.reserveOver <= 0) return { ...s, gebeurd: { soort: 'kan-niet', reden: 'reserve' }, nr };
      if (s.peil >= WAND) return { ...s, gebeurd: { soort: 'kan-niet', reden: 'vol' }, nr };
      return {
        ...s,
        peil: nieuwPeil(s.peil, RESERVE_MLN),
        reserveOver: s.reserveOver - 1,
        gebeurd: { soort: 'reserve', bedragMln: RESERVE_MLN },
        nr,
      };
    }
    case 'wet':
      return { ...s, gebeurd: { soort: 'wet', post: a.post }, nr };
  }
}

/** Het level is voorbij: alle schepen zijn door de sluis, of de levens zijn op. */
export const levelVoorbij = (s: Stand, schepen: number): boolean =>
  s.levens <= 0 || s.klaar >= schepen;

/** Gehaald: het level is voorbij en je hebt nog een leven over. */
export const levelGehaald = (s: Stand, schepen: number): boolean =>
  s.levens > 0 && s.klaar >= schepen;

/** De score: alle veilige schepen (het beste van elk level), van het totaal aan schepen. */
export function sluisScore(veiligPerLevel: readonly number[]): { score: number; max: number } {
  const max = LEVELS.reduce((s, l) => s + l.schepen, 0);
  const score = veiligPerLevel.reduce((s, v) => s + v, 0);
  return { score: Math.min(max, score), max };
}

/** Wat de sluiswachter nu het beste kan doen (voor de tests): het peil zo dicht mogelijk bij 0. */
export function besteZet(s: Stand, opties: readonly Bezuiniging[], ozb: number): Actie | undefined {
  if (isVeilig(s.peil) && Math.abs(s.peil) <= VEILIG - 2) return undefined;
  const kandidaten: Actie[] = [{ soort: 'ozb', richting: -1, stapMln: ozb }];
  if (s.ozbOmhoog < OZB_KEER) kandidaten.push({ soort: 'ozb', richting: 1, stapMln: ozb });
  if (s.reserveOver > 0) kandidaten.push({ soort: 'reserve' });
  for (const o of opties)
    if (!s.bezuinigd.some((b) => b.post.id === o.post.id))
      kandidaten.push({ soort: 'bezuinig', optie: o });
  let beste: Actie | undefined;
  let afstand = Math.abs(s.peil);
  for (const k of kandidaten) {
    const na = stap(s, k);
    if (Math.abs(na.peil) < afstand - 0.05) {
      afstand = Math.abs(na.peil);
      beste = k;
    }
  }
  return beste;
}
