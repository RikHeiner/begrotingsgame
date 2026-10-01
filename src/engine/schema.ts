/**
 * Zod-schema's voor alle data in `data/`, en de TypeScript-types die daarvan zijn afgeleid.
 * Uitbreidingen ten opzichte van de aangeleverde JSON staan beschreven in `data/SCHEMA.md`.
 */
import { z } from 'zod';

const jaarRecord = z.record(z.string().regex(/^\d{4}$/), z.number());

// ---------- config.json ----------

export const scenarioSchema = z.enum(['voorzichtig', 'midden', 'optimistisch']);
export type Scenario = z.infer<typeof scenarioSchema>;

const bestandsnaam = z.string().regex(/^[\w.-]+\.json$/, 'een bestandsnaam op .json zonder pad');

export const configSchema = z
  .object({
    actiefJaar: z.number().int(),
    begroting: bestandsnaam,
    vergelijking: z.array(bestandsnaam),
    meerjarenHorizon: z.array(z.number().int()).min(1),
    scenario: scenarioSchema.default('midden'),
  })
  .strict()
  .refine((c) => c.meerjarenHorizon.every((j, i) => j === c.actiefJaar + i), {
    message: 'meerjarenHorizon moet opeenvolgende jaren bevatten, beginnend bij actiefJaar',
    path: ['meerjarenHorizon'],
  });
export type Config = z.infer<typeof configSchema>;

// ---------- begroting-JJJJ.json ----------

const ingroeipad = z.array(z.number().min(0).max(1)).min(1);

export const onderdeelSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string().min(1),
    deelprogramma: z.string(),
    gebouw: z.string(),
    lasten_mln: z.number().nonnegative(),
    gekoppelde_baten_mln: z.number().nonnegative(),
    min_pct: z.number().min(-100).max(0).nullable(),
    max_pct: z.number().min(0).max(100).nullable(),
    vergrendeld: z.boolean(),
    reden_vergrendeld: z.string().nullable(),
    doorgeefluik_heffing: z.boolean(),
    wettelijke_taak: z.boolean(),
    meters: z.record(z.string(), z.number()),
    tekst_bezuinigen: z.string().nullable(),
    tekst_investeren: z.string().nullable(),
    bron: z.string(),
    // Uitbreidingen (optioneel), zie data/SCHEMA.md
    ingroeipad: ingroeipad.optional(),
    lasten_per_jaar_mln: jaarRecord.optional(),
    voorstel: z.boolean().optional(),
    controleren: z.boolean().optional(),
  })
  .strict();
export type Onderdeel = z.infer<typeof onderdeelSchema>;

export const belastingSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string().min(1),
    deelprogramma: z.string(),
    opbrengst_mln: z.number().nonnegative(),
    min_pct: z.number().min(-100).max(0),
    max_pct: z.number().min(0).max(100),
    voelbaarheid_portemonnee: z.number().min(0).max(1),
    uitleg: z.string(),
    // Uitbreiding: tarieven voor "Wat betekent het voor mij?" (fase 6)
    tarieven: z.record(z.string(), z.number()).optional(),
  })
  .strict();
export type Belasting = z.infer<typeof belastingSchema>;

export const investeringSchema = z
  .object({
    bedrag_mln: z.number().positive(),
    levensduur_jaar: z.number().int().positive(),
    eenmalige_bijdrage: z.boolean(),
  })
  .strict();
export type Investering = z.infer<typeof investeringSchema>;

export const actiekaartSchema = z
  .object({
    id: z.string().min(1),
    soort: z.enum(['opbrengst', 'uitgave']),
    structureel_of_incidenteel: z.enum(['S', 'I']),
    bedrag_mln: z.number(),
    naam: z.string().min(1),
    uitleg: z.string(),
    meter_effect_punten: z.record(z.string(), z.number()),
    bron: z.string(),
    // Uitbreidingen
    investering: investeringSchema.optional(),
    ingroeipad: ingroeipad.optional(),
    gebouw: z.string().optional(),
  })
  .strict()
  .refine((k) => (k.soort === 'opbrengst' ? k.bedrag_mln >= 0 : k.bedrag_mln <= 0), {
    message: 'een opbrengst heeft een positief bedrag, een uitgave een negatief bedrag',
    path: ['bedrag_mln'],
  });
export type Actiekaart = z.infer<typeof actiekaartSchema>;

export const deelprogrammaSchema = z
  .object({
    code: z.string(),
    programma: z.string(),
    naam: z.string(),
    lasten_x1000: jaarRecord,
    baten_x1000: jaarRecord,
    bron: z.string(),
  })
  .strict();
export type Deelprogramma = z.infer<typeof deelprogrammaSchema>;

export const bekendeAfwijkingSchema = z
  .object({
    controle: z.string(),
    deelprogramma: z.string().optional(),
    id: z.string().optional(),
    toelichting: z.string(),
  })
  .strict();
export type BekendeAfwijking = z.infer<typeof bekendeAfwijkingSchema>;

export const begrotingSchema = z
  .object({
    schema_versie: z.string(),
    begrotingsjaar: z.number().int(),
    document: z.string(),
    bron_url: z.string().url(),
    eenheid: z.string(),
    totalen: z
      .object({
        lasten_excl_reserves_x1000: jaarRecord,
        baten_excl_reserves_x1000: jaarRecord,
        toevoegingen_reserves_x1000: jaarRecord,
        onttrekkingen_reserves_x1000: jaarRecord,
        saldo_x1000: jaarRecord,
        bron: z.string(),
      })
      .strict(),
    // De sleutel bevat het jaartal (kengetallen_2026); daarom een vrije sleutel.
    programmas: z.array(z.object({ code: z.string(), naam: z.string() }).strict()),
    deelprogrammas: z.array(deelprogrammaSchema).min(1),
    onderdelen: z.array(onderdeelSchema).min(1),
    belastingen: z.array(belastingSchema),
    actiekaarten: z.array(actiekaartSchema),
    opmerkingen: z.array(z.string()).optional(),
    bekende_afwijkingen: z.array(bekendeAfwijkingSchema).optional(),
  })
  .catchall(z.unknown());
export type Begroting = z.infer<typeof begrotingSchema>;

export const kengetallenSchema = z
  .object({
    gemeentefonds_x1000: z.number(),
    opbrengst_belastingen_totaal_x1000: z.number(),
    ozb_x1000: z.number(),
    algemene_reserve_x1000: z.number(),
    ratio_weerstandsvermogen: z.number().positive(),
    aantal_woningen: z.number().int(),
    gemiddelde_woz: z.number(),
    bron: z.string(),
  })
  .catchall(z.unknown());
export type Kengetallen = z.infer<typeof kengetallenSchema>;

/** Haalt `kengetallen_JJJJ` uit de begroting, voor het jaar van die begroting. */
export function leesKengetallen(begroting: Begroting): Kengetallen {
  const sleutel = `kengetallen_${begroting.begrotingsjaar}`;
  return kengetallenSchema.parse(begroting[sleutel]);
}

// ---------- dwarsverbanden.json ----------

export const zekerheidSchema = z.enum(['feit', 'aanname', 'te onderzoeken']);
export type Zekerheid = z.infer<typeof zekerheidSchema>;

export const parameterSchema = z
  .object({
    waarde: z.union([z.number(), z.array(z.number()), z.null()]),
    eenheid: z.string(),
    status: zekerheidSchema,
    toelichting: z.string(),
    // Uitbreiding: bandbreedte voor de scenario's (standaard 50% en 150% van de waarde)
    laag: z.number().optional(),
    hoog: z.number().optional(),
  })
  .strict();
export type Parameter = z.infer<typeof parameterSchema>;

export const richtingSchema = z.enum([
  'beide',
  'bezuiniging',
  'investering',
  'groei',
  'regel',
  'gebeurtenis',
]);

export const dwarsverbandSchema = z
  .object({
    id: z.string().min(1),
    categorie: z.string(),
    naam: z.string(),
    van: z.array(z.string()).min(1),
    naar: z.array(z.string()).min(1),
    mechanisme: z.string(),
    formule: z.string(),
    parameters: z.record(z.string(), parameterSchema),
    vertraging_jaren: z.number().int().nonnegative(),
    richting: richtingSchema,
    meters: z.record(z.string(), z.string()),
    melding: z.string(),
    bron: z.string(),
  })
  .strict();
export type Dwarsverband = z.infer<typeof dwarsverbandSchema>;

export const dwarsverbandenSchema = z
  .object({
    schema_versie: z.string(),
    toelichting: z.string(),
    dwarsverbanden: z.array(dwarsverbandSchema),
    vocabulaire: z
      .object({
        uitleg: z.string(),
        voorvoegsels: z.record(z.string(), z.string()),
        nieuw: z.record(z.string(), z.string()),
      })
      .strict(),
  })
  .strict();
export type Dwarsverbanden = z.infer<typeof dwarsverbandenSchema>;

// ---------- tegenbegroting-*.json ----------

const tegenbegrotingPost = z
  .object({
    omschrijving: z.string(),
    bedrag_mln: z.number().nonnegative(),
    S_of_I: z.enum(['S', 'I']),
    game_koppeling: z.string().nullable(),
    opmerking: z.string().optional(),
  })
  .strict();
export type TegenbegrotingPost = z.infer<typeof tegenbegrotingPost>;

export const tegenbegrotingSchema = z
  .object({
    titel: z.string(),
    bron_url: z.string().url(),
    ombuigingen_en_opbrengsten: z.array(tegenbegrotingPost),
    uitgaven: z.array(tegenbegrotingPost),
    controle: z
      .object({
        ombuigingen_structureel: z.number(),
        ombuigingen_incidenteel: z.number(),
        ombuigingen_totaal: z.number(),
        uitgaven_structureel: z.number(),
        uitgaven_incidenteel: z.number(),
        uitgaven_totaal: z.number(),
        bekende_afwijkingen: z.array(z.string()),
      })
      .strict(),
    gebruik_in_game: z.string().optional(),
  })
  .strict();
export type Tegenbegroting = z.infer<typeof tegenbegrotingSchema>;

// ---------- spel/meters.json ----------

export const meterIdSchema = z.enum([
  'veilig',
  'schoon',
  'zorg',
  'werk',
  'sport_cultuur',
  'portemonnee',
  'wonen',
  'dienstverlening',
]);
export type MeterId = z.infer<typeof meterIdSchema>;
export const METER_IDS = meterIdSchema.options;

export const metersSchema = z
  .object({
    toelichting: z.string(),
    meters: z
      .array(
        z
          .object({
            id: meterIdSchema,
            kort: z.string().min(1),
            naam: z.string(),
            icoon: z.string(),
          })
          .strict(),
      )
      .length(METER_IDS.length),
    spelregels: z
      .object({
        gevoeligheid_onderdelen: z.number().positive(),
        gevoeligheid_belastingen: z.number().positive(),
        punten_dwarsverband_per_100pct: z.number().nonnegative(),
        uitleg: z.string(),
      })
      .strict(),
  })
  .strict();
export type MetersData = z.infer<typeof metersSchema>;

// ---------- spel/gebouwen.json ----------

export const gebouwSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string(),
    thema: z.string(),
    icoon: z.string(),
    wijk: z.string().regex(/^WK\d{6}$/),
    soort: z.enum(['gebouw', 'park', 'loket', 'veilinghuis', 'landmark']),
    omschrijving: z.string(),
    onderdelen: z.array(z.string()),
    positie: z.object({ lon: z.number(), lat: z.number() }).strict().optional(),
  })
  .strict();
export type Gebouw = z.infer<typeof gebouwSchema>;

export const gebouwenSchema = z
  .object({ toelichting: z.string(), gebouwen: z.array(gebouwSchema).min(1) })
  .strict();

// ---------- spel/personas.json ----------

export const personaSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string(),
    leeftijd: z.number().int().nullable(),
    wijk: z.string().regex(/^WK\d{6}$/),
    situatie: z.string(),
    meters: z.partialRecord(meterIdSchema, z.number().nonnegative()),
    posten: z.record(z.string(), z.number()),
  })
  .strict();
export type Persona = z.infer<typeof personaSchema>;

export const personasSchema = z
  .object({
    toelichting: z.string(),
    spelregels: z
      .object({
        gewicht_meters: z.number().nonnegative(),
        punten_posten_per_100pct: z.number().nonnegative(),
      })
      .strict(),
    personas: z.array(personaSchema).min(1),
  })
  .strict();
export type PersonasData = z.infer<typeof personasSchema>;

// ---------- mappings/id-mapping-JJJJ-JJJJ.json ----------

export const idMappingSchema = z
  .object({
    van_jaar: z.number().int(),
    naar_jaar: z.number().int(),
    posten: z.array(
      z
        .object({
          oud: z.string(),
          nieuw: z.string().nullable(),
          oude_naam: z.string().optional(),
          nieuwe_naam: z.string().optional(),
          vervallen: z.boolean().optional(),
          splitst_in: z.array(z.string()).optional(),
          samengevoegd_uit: z.array(z.string()).optional(),
          toelichting: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type IdMapping = z.infer<typeof idMappingSchema>;
