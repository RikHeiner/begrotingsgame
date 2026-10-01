/**
 * Een kleine, veilige taal voor de voorwaarden in data/spel/reacties.json, bijvoorbeeld
 *   pct.o1 <= -25 && !kaart.k_licht
 * Geen eval: een eigen tokenizer en parser (recursive descent) die een boom maakt, en een evaluator
 * die alleen getallen en de namen uit de context kent.
 *
 * Grammatica:
 *   of      := en ('||' en)*
 *   en      := niet ('&&' niet)*
 *   niet    := '!' niet | vergelijk
 *   vergelijk := som (('<' | '<=' | '>' | '>=' | '==' | '!=') som)?
 *   som     := product (('+' | '-') product)*
 *   product := unair (('*' | '/') unair)*
 *   unair   := '-' unair | atoom
 *   atoom   := getal | 'true' | 'false' | naam ('.' naam)* | '(' of ')'
 */

export type Knoop =
  | { soort: 'getal'; waarde: number }
  | { soort: 'naam'; naam: string }
  | { soort: 'niet'; arg: Knoop }
  | { soort: 'min'; arg: Knoop }
  | { soort: 'binair'; op: string; links: Knoop; rechts: Knoop };

export class ExpressieFout extends Error {}

type Token = { soort: 'getal' | 'naam' | 'op' | 'haak'; tekst: string; pos: number };

const OPERATOREN = ['<=', '>=', '==', '!=', '&&', '||', '<', '>', '+', '-', '*', '/', '!'];

function tokeniseer(bron: string): Token[] {
  const uit: Token[] = [];
  let i = 0;
  while (i < bron.length) {
    const ch = bron[i] ?? '';
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const getal = /^\d+(\.\d+)?/.exec(bron.slice(i));
    if (getal) {
      uit.push({ soort: 'getal', tekst: getal[0], pos: i });
      i += getal[0].length;
      continue;
    }
    const naam = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*/.exec(bron.slice(i));
    if (naam) {
      uit.push({ soort: 'naam', tekst: naam[0], pos: i });
      i += naam[0].length;
      continue;
    }
    if (ch === '(' || ch === ')') {
      uit.push({ soort: 'haak', tekst: ch, pos: i });
      i++;
      continue;
    }
    const op = OPERATOREN.find((o) => bron.startsWith(o, i));
    if (op) {
      uit.push({ soort: 'op', tekst: op, pos: i });
      i += op.length;
      continue;
    }
    throw new ExpressieFout(`Onbekend teken "${ch}" op positie ${i} in "${bron}".`);
  }
  return uit;
}

export function parseer(bron: string): Knoop {
  const tokens = tokeniseer(bron);
  let i = 0;
  const kijk = (): Token | undefined => tokens[i];
  const is = (tekst: string) => kijk()?.tekst === tekst && kijk()?.soort !== 'naam';
  const neem = (): Token => {
    const t = tokens[i++];
    if (!t) throw new ExpressieFout(`Onverwacht einde in "${bron}".`);
    return t;
  };

  const binair = (volgende: () => Knoop, ops: string[]) => (): Knoop => {
    let links = volgende();
    while (ops.some(is)) {
      const op = neem().tekst;
      links = { soort: 'binair', op, links, rechts: volgende() };
    }
    return links;
  };

  const atoom = (): Knoop => {
    const t = neem();
    if (t.soort === 'getal') return { soort: 'getal', waarde: Number(t.tekst) };
    if (t.soort === 'naam') {
      if (t.tekst === 'true') return { soort: 'getal', waarde: 1 };
      if (t.tekst === 'false') return { soort: 'getal', waarde: 0 };
      return { soort: 'naam', naam: t.tekst };
    }
    if (t.tekst === '(') {
      const binnen = of();
      if (neem().tekst !== ')') throw new ExpressieFout(`Haakje sluiten ontbreekt in "${bron}".`);
      return binnen;
    }
    throw new ExpressieFout(`Onverwacht "${t.tekst}" op positie ${t.pos} in "${bron}".`);
  };
  const unair = (): Knoop => {
    if (is('-')) {
      neem();
      return { soort: 'min', arg: unair() };
    }
    return atoom();
  };
  const product = binair(unair, ['*', '/']);
  const som = binair(product, ['+', '-']);
  const vergelijk = (): Knoop => {
    const links = som();
    const op = ['<=', '>=', '==', '!=', '<', '>'].find(is);
    if (!op) return links;
    neem();
    return { soort: 'binair', op, links, rechts: som() };
  };
  const niet = (): Knoop => {
    if (is('!')) {
      neem();
      return { soort: 'niet', arg: niet() };
    }
    return vergelijk();
  };
  const en = binair(niet, ['&&']);
  const of = binair(en, ['||']);

  const boom = of();
  if (i < tokens.length) {
    throw new ExpressieFout(
      `Onverwacht "${tokens[i]?.tekst}" op positie ${tokens[i]?.pos} in "${bron}".`,
    );
  }
  return boom;
}

/** De namen die een voorwaarde in reacties.json mag gebruiken (zie src/game/reacties/context.ts). */
export function bekendeNamen(data: {
  begroting: {
    onderdelen: { id: string }[];
    belastingen: { id: string }[];
    actiekaarten: { id: string }[];
  };
  personas: { personas: { id: string }[] };
  gebouwen: { id: string }[];
  meterIds: readonly string[];
}): Set<string> {
  return new Set([
    ...data.begroting.onderdelen.map((o) => `pct.${o.id}`),
    ...data.begroting.belastingen.map((b) => `tax.${b.id}`),
    ...data.begroting.actiekaarten.map((k) => `kaart.${k.id}`),
    ...data.meterIds.map((m) => `meter.${m}`),
    ...data.personas.personas.map((p) => `persona.${p.id}`),
    ...data.gebouwen.map((g) => `gebouw.${g.id}`),
    'saldo.structureel',
    'saldo.incidenteel',
    'sluitend',
    'reserve',
    'vrijgemaakt',
    'geinvesteerd',
    'lasten_verschil',
    'weerstand',
    'woningen',
    'persona_min',
    'meter_min',
  ]);
}

/** Alle namen die een expressie gebruikt (voor data-check). */
export function namen(knoop: Knoop): string[] {
  switch (knoop.soort) {
    case 'getal':
      return [];
    case 'naam':
      return [knoop.naam];
    case 'niet':
    case 'min':
      return namen(knoop.arg);
    case 'binair':
      return [...namen(knoop.links), ...namen(knoop.rechts)];
  }
}

/** Rekent een expressie uit. Waar (1) of niet waar (0) bij vergelijkingen; onbekende namen gooien. */
export function evalueer(knoop: Knoop, lees: (naam: string) => number): number {
  switch (knoop.soort) {
    case 'getal':
      return knoop.waarde;
    case 'naam':
      return lees(knoop.naam);
    case 'niet':
      return evalueer(knoop.arg, lees) ? 0 : 1;
    case 'min':
      return -evalueer(knoop.arg, lees);
    case 'binair': {
      const a = evalueer(knoop.links, lees);
      if (knoop.op === '&&') return a && evalueer(knoop.rechts, lees) ? 1 : 0;
      if (knoop.op === '||') return a || evalueer(knoop.rechts, lees) ? 1 : 0;
      const b = evalueer(knoop.rechts, lees);
      switch (knoop.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return b === 0 ? 0 : a / b;
        case '<':
          return a < b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '>':
          return a > b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
        case '==':
          return a === b ? 1 : 0;
        case '!=':
          return a !== b ? 1 : 0;
      }
      throw new ExpressieFout(`Onbekende operator ${knoop.op}.`);
    }
  }
}
