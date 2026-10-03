/**
 * Zod-schema's voor alle data in `data/`, en de TypeScript-types die daarvan zijn afgeleid.
 * Uitbreidingen ten opzichte van de aangeleverde JSON staan beschreven in `data/SCHEMA.md`.
 */
import { z } from 'zod';

// Geen eval of new Function: dan werkt de game met een strenge Content Security Policy.
z.config({ jitless: true });

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
    vergelijkingTonen: z.boolean().default(true),
    /** tarieven van de lokale heffingen (voor "Wat betekent het voor mij?"), optioneel */
    tarieven: bestandsnaam.optional(),
    /** parkeren per vergunning en tariefgebied (verdeelt de schuif t5), optioneel */
    parkeren: bestandsnaam.optional(),
    /** woonlasten per gemeente (vergelijking in "Wat betekent het voor mij?"), optioneel */
    woonlasten: bestandsnaam.optional(),
    /** uitgaven per inwoner van andere gemeenten (vergelijking in de gebouwen), optioneel */
    uitgaven: bestandsnaam.optional(),
    /** landelijke gemiddelden van de gemeentebelastingen (bij het belastingloket), optioneel */
    belastingenNederland: bestandsnaam.optional(),
  })
  .strict()
  .refine((c) => c.meerjarenHorizon.every((j, i) => j === c.actiefJaar + i), {
    message: 'meerjarenHorizon moet opeenvolgende jaren bevatten, beginnend bij actiefJaar',
    path: ['meerjarenHorizon'],
  });
export type Config = z.infer<typeof configSchema>;

// ---------- begroting-JJJJ.json ----------

const ingroeipad = z.array(z.number().min(0).max(1)).min(1);

/**
 * Waarom een post niet lager kan dan min_pct (of vastzit): een wettelijke plicht, een
 * gemeenschappelijke regeling, vaste lasten, of nodig voor andere taken. Bij nul (de standaard)
 * staat de post op dit minimum.
 */
export const minimumSchema = z
  .object({
    soort: z.enum(['wet', 'gr', 'vast', 'nodig']),
    /** voor de speler, B1 */
    reden: z.string().min(1),
    /** wet en artikel, bijvoorbeeld "Participatiewet, art. 35" */
    wet: z.string().optional(),
    /** waar het staat (URL) */
    bron: z.string().optional(),
    /** feit: volgt direct uit wet of document; aanname: het percentage is geschat */
    zekerheid: z.enum(['feit', 'aanname']),
    /** hoe het percentage is bepaald (voor de fractie, niet in de game) */
    berekening: z.string().optional(),
  })
  .strict();
export type Minimum = z.infer<typeof minimumSchema>;

export const onderdeelSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string().min(1),
    deelprogramma: z.string(),
    gebouw: z.string(),
    lasten_mln: z.number().nonnegative(),
    gekoppelde_baten_mln: z.number().nonnegative(),
    min_pct: z.number().min(-100).max(0).nullable(),
    /** null = geen maximum (alleen bij een echte grens een getal, met max_reden) */
    max_pct: z.number().min(0).nullable(),
    /** waarom er een maximum is (bijvoorbeeld een wettelijke grens) */
    max_reden: z.string().optional(),
    vergrendeld: z.boolean(),
    reden_vergrendeld: z.string().nullable(),
    doorgeefluik_heffing: z.boolean(),
    wettelijke_taak: z.boolean(),
    /** waarom lager dan min_pct niet kan; verplicht als min_pct hoger is dan −100 */
    minimum: minimumSchema.optional(),
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
    /** waar de opbrengst staat (pagina in het boekwerk) */
    bron: z.string().optional(),
    min_pct: z.number().min(-100).max(0),
    /** null = geen maximum */
    max_pct: z.number().min(0).nullable(),
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
    /** zekerheid van het bedrag (standaard feit) */
    zekerheid: z.enum(['feit', 'aanname', 'te onderzoeken']).optional(),
  })
  .strict()
  .refine((k) => (k.soort === 'opbrengst' ? k.bedrag_mln >= 0 : k.bedrag_mln <= 0), {
    message: 'een opbrengst heeft een positief bedrag, een uitgave een negatief bedrag',
    path: ['bedrag_mln'],
  });
export type Actiekaart = z.infer<typeof actiekaartSchema>;

/**
 * Een programma binnen een post, in het Beleidshuis: stopzetten verlaagt de post met het bedrag,
 * weer aanzetten verhoogt hem. Bij nul staat het programma stil (de post staat op zijn minimum).
 */
export const programmaSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string().min(1),
    /** wat merkt een inwoner (B1) */
    uitleg: z.string(),
    /** de post waar het programma in zit */
    post: z.string().min(1),
    /** lasten per jaar */
    bedrag_mln: z.number().positive(),
    /**
     * S: elk jaar (stopzetten verlaagt de schuif van de post). I: alleen in het eerste jaar
     * (stopzetten scheelt dan eenmalig, zolang de post boven zijn minimum zit).
     */
    structureel_of_incidenteel: z.enum(['S', 'I']),
    /** nummers uit de optielijst van de fractie (docs/OPTIES-KOPPELING.md) */
    opties: z.array(z.number().int()).optional(),
    bron: z.string(),
    zekerheid: z.enum(['feit', 'aanname']),
    berekening: z.string().optional(),
  })
  .strict();
export type Programma = z.infer<typeof programmaSchema>;

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
    /** bij een afwijking in de totalen: het jaar */
    jaar: z.number().int().optional(),
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
    /** programma's binnen posten, in het Beleidshuis */
    beleidsprogrammas: z.array(programmaSchema).optional(),
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

export const richtingSchema = z.enum(['beide', 'bezuiniging', 'investering', 'groei', 'regel']);

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
    buurt: z.string().regex(/^BU\d{8}$/),
    gebied: z.string().min(1),
    soort: z.enum(['gebouw', 'park', 'loket', 'veilinghuis', 'beleidshuis', 'landmark']),
    omschrijving: z.string(),
    onderdelen: z.array(z.string()),
    positie: z.object({ lon: z.number(), lat: z.number() }).strict().optional(),
    kleur: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    dak: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .strict();
export type Gebouw = z.infer<typeof gebouwSchema>;

export const gebouwenSchema = z
  .object({ toelichting: z.string(), gebouwen: z.array(gebouwSchema).min(1) })
  .strict();

// ---------- spel/gebieden.json ----------

export const gebiedenSchema = z
  .object({
    toelichting: z.string(),
    bron: z.string().url(),
    gebieden: z
      .array(
        z
          .object({
            id: z.string().min(1),
            naam: z.string(),
            buurten: z.array(z.string().regex(/^BU\d{8}$/)),
          })
          .strict(),
      )
      .min(1),
    controleren: z.array(z.string()),
  })
  .strict();
export type GebiedenData = z.infer<typeof gebiedenSchema>;

// ---------- spel/kaart.json ----------

const lonlat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const kaartSchema = z
  .object({
    toelichting: z.string(),
    centrum: z.object({ lon: z.number(), lat: z.number(), naam: z.string() }).strict(),
    vergroting: z.object({ exponent: z.number().positive().max(1) }).strict(),
    wereld_breedte: z.number().positive(),
    /**
     * Kanteling (2,5D): de kaart wordt in de hoogte ingedrukt alsof je er schuin op kijkt, met een
     * dikke rand eronder. 1 = recht van boven. De gebouwen blijven rechtop staan.
     */
    kanteling: z.number().min(0.3).max(1).default(1),
    /** dikte van de rand onder de gekantelde kaart, in wereldeenheden */
    dikte: z.number().min(0).max(40).default(0),
    zoom_max: z.number().min(1),
    toestanden: z
      .object({
        gesloten_tot: z.number(),
        versoberd_tot: z.number(),
        normaal_tot: z.number(),
        beter_tot: z.number(),
      })
      .strict()
      .refine(
        (t) =>
          t.gesloten_tot < t.versoberd_tot &&
          t.versoberd_tot < t.normaal_tot &&
          t.normaal_tot < t.beter_tot,
        { message: 'de drempels moeten oplopen' },
      ),
    water: z.array(
      z
        .object({
          id: z.string(),
          naam: z.string(),
          soort: z.enum(['kanaal', 'meer', 'buurt']),
          lijn: z.array(lonlat).min(2).optional(),
          vlak: z.array(lonlat).min(3).optional(),
          buurt: z
            .string()
            .regex(/^BU\d{8}$/)
            .optional(),
          breedte: z.number().positive().optional(),
          schets: z.boolean(),
        })
        .strict(),
    ),
    labels: z.array(
      z
        .object({
          tekst: z.string(),
          lon: z.number(),
          lat: z.number(),
          soort: z.enum(['dorp', 'gebied', 'water']),
        })
        .strict(),
    ),
  })
  .strict();
export type KaartData = z.infer<typeof kaartSchema>;

// ---------- spel/reacties.json ----------

export const reactieSchema = z
  .object({
    id: z.string().min(1),
    voorwaarde: z.string().min(1),
    tekst: z.string().min(1).max(90),
    personas: z.array(z.string()).min(1).optional(),
    gewicht: z.number().positive(),
    toon: z.enum(['positief', 'negatief', 'neutraal']),
  })
  .strict();
export type Reactie = z.infer<typeof reactieSchema>;

export const reactiesSchema = z
  .object({ toelichting: z.string(), reacties: z.array(reactieSchema).min(1) })
  .strict();

// ---------- spel/badges.json ----------

export const badgesSchema = z
  .object({
    toelichting: z.string(),
    badges: z.array(
      z
        .object({
          id: z.string().min(1),
          icoon: z.string(),
          naam: z.string(),
          uitleg: z.string(),
          voorwaarde: z.string().min(1),
        })
        .strict(),
    ),
    score: z.object({ gezond_mln: z.number() }).strict(),
  })
  .strict();
export type BadgesData = z.infer<typeof badgesSchema>;

// ---------- spel/teksten.json ----------

export const tekstenSchema = z
  .object({
    toelichting: z.string(),
    titel: z.string(),
    /** startscherm; {bedrag} en {jaar} worden ingevuld */
    start: z
      .object({
        kop: z.string(),
        intro: z.string(),
        vragen: z
          .array(z.object({ icoon: z.string(), kop: z.string(), tekst: z.string() }).strict())
          .min(1),
        hoe_kop: z.string(),
        hoe: z.array(z.string()).min(1),
        /** wie de game maakt, boven aan het startscherm */
        afzender: z.string(),
        /** de knop om te beginnen (altijd bij nul) */
        knop: z.string(),
        /** uitleg onder de knop */
        keuze_uitleg: z.string(),
        /** de knop als het startscherm later als uitleg opent */
        knop_terug: z.string(),
        /** {vrij} wordt ingevuld */
        nul_melding: z.string(),
        noot: z.string(),
      })
      .strict(),
    /** coachmarks als je begint met de begroting van het college */
    tutorial: z.array(z.object({ id: z.string(), tekst: z.string() }).strict()).min(1),
    /** coachmarks als je begint bij nul (de standaard) */
    tutorial_nul: z.array(z.object({ id: z.string(), tekst: z.string() }).strict()).min(1),
    slot_dicht: z.string(),
    slot_open: z.string(),
    inwoners_uitleg: z.string(),
    aanname_uitleg: z.string(),
    eindscherm: z.object({ ingediend: z.string(), niet_sluitend: z.string() }).strict(),
    colofon: z.string(),
    insturen: z
      .object({
        toestemming_versie: z.number().int().positive(),
        uitleg: z.string(),
        toestemming: z.string(),
        email_toestemming: z.string(),
        privacy: z.array(z.string()).min(1),
        bedankt: z.string(),
        idee_waarschuwing: z.string(),
      })
      .strict(),
  })
  .strict();
export type Teksten = z.infer<typeof tekstenSchema>;

// ---------- tarieven-JJJJ.json ----------

const euro = z.number().nonnegative();
export const tarievenSchema = z
  .object({
    begrotingsjaar: z.number().int(),
    toelichting: z.string(),
    bron: z.string().min(1),
    bron_url: z.string().url(),
    status: zekerheidSchema.or(z.literal('te controleren')),
    /** procent van de WOZ-waarde (0,1473 = 0,1473%) */
    ozb_woning_eigenaar_pct: z.number().positive(),
    afvalstoffenheffing: z
      .object({ een_persoon: euro, twee_personen: euro, drie_of_meer: euro })
      .strict(),
    rioolheffing_eigenaar: euro,
    /** tarief als de hondenbelasting (weer) wordt ingevoerd met de actiekaart */
    hondenbelasting: z
      .object({ kaart: z.string(), tarief: euro, jaar: z.number().int(), bron: z.string() })
      .strict()
      .optional(),
    kwijtschelding: z
      .object({
        belastingen: z.array(z.enum(['afvalstoffenheffing', 'rioolheffing', 'ozb'])),
        toelichting: z.string(),
      })
      .strict(),
  })
  .strict();
export type Tarieven = z.infer<typeof tarievenSchema>;

// ---------- parkeren-JJJJ.json ----------

const parkeerBedrag = z
  .object({
    bedrag: z.number().nonnegative(),
    /** het jaar van het tarief; is dat niet het begrotingsjaar, dan wordt er geïndexeerd */
    prijspeil: z.number().int(),
    bron: z.string(),
    aanname: z.string().optional(),
  })
  .strict();

export const parkerenSchema = z
  .object({
    begrotingsjaar: z.number().int(),
    toelichting: z.string(),
    bronnen: z.array(
      z
        .object({
          id: z.string(),
          titel: z.string(),
          url: z.string().url(),
          datum: z.string(),
          status: z.enum(['feit', 'aanname', 'te onderzoeken', 'te controleren']),
        })
        .strict(),
    ),
    opbrengst: z
      .object({
        belasting: z.string(),
        /** het gebouw op de kaart met de parkeerschuiven */
        gebouw: z.string(),
        kengetal_parkeerbelasting: z.string(),
        garages_toelichting: z.string(),
      })
      .strict(),
    indexatie: z.array(
      z
        .object({
          naar_jaar: z.number().int(),
          pct: z.number(),
          bron: z.string(),
          toelichting: z.string(),
        })
        .strict(),
    ),
    parkeerzones: z.array(
      z.object({ id: z.string(), naam: z.string(), uurtarief: parkeerBedrag.nullable() }).strict(),
    ),
    tariefgebieden: z
      .array(z.object({ id: z.string(), kort: z.string(), naam: z.string() }).strict())
      .min(1),
    aantallen: z
      .object({
        peiljaar: z.number().int(),
        bron: z.string(),
        toelichting: z.string(),
        totaal_volgens_bron: z.record(z.string(), z.number().int()),
        gebieden: z.array(
          z
            .object({
              naam: z.string(),
              parkeerzone: z.string(),
              tariefgebied: z.string(),
              bewoners_1: z.number().int().nonnegative(),
              bewoners_2: z.number().int().nonnegative(),
              bezoekers: z.number().int().nonnegative(),
              bedrijven: z.number().int().nonnegative(),
            })
            .strict(),
        ),
      })
      .strict(),
    vergunningen: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z0-9_]+$/),
          naam: z.string(),
          per_tariefgebied: z.boolean(),
          /** per tariefgebied, of 'alle' */
          tarief: z.record(z.string(), parkeerBedrag),
          /** alleen als het aantal niet uit de tabel per gebied komt */
          aantal: z
            .object({
              waarde: z.number().int().nonnegative(),
              peiljaar: z.number().int(),
              bron: z.string(),
            })
            .strict()
            .optional(),
          min_pct: z.number(),
          max_pct: z.number().nullable(),
          uitleg: z.string(),
        })
        .strict(),
    ),
    kortparkeren: z
      .object({
        naam: z.string(),
        min_pct: z.number(),
        max_pct: z.number().nullable(),
        uitleg: z.string(),
      })
      .strict(),
    garages: z
      .object({
        naam: z.string(),
        min_pct: z.number(),
        max_pct: z.number().nullable(),
        uitleg: z.string(),
      })
      .strict(),
  })
  .strict();
export type ParkerenData = z.infer<typeof parkerenSchema>;

// ---------- woonlasten-JJJJ.json ----------

const woonlastenBron = z
  .object({
    id: z.string(),
    titel: z.string(),
    url: z.string().url(),
    /** de pagina waar het bestand of plaatje op staat */
    pagina: z.string().url().optional(),
    opgehaald: z.string(),
    status: z.enum(['feit', 'aanname', 'te onderzoeken', 'te controleren']),
  })
  .strict();

export const woonlastenSchema = z
  .object({
    jaar: z.number().int(),
    toelichting: z.string(),
    definitie: z.string(),
    bronnen: z.array(woonlastenBron).min(1),
    /** cijfers die niet in het databestand staan en met de hand van de site zijn overgenomen */
    handmatig: z
      .object({
        landelijk_gemiddelde: z
          .object({
            koop_een: euro,
            koop_meer: euro,
            huur_een: euro,
            huur_meer: euro,
            bron: z.string(),
          })
          .strict(),
        /** woonlasten van huurders en de rangnummers van COELO voor één gemeente */
        gemeente: z
          .object({
            code: z.string(),
            huur_een: euro,
            huur_meer: euro,
            rang_koop_meer: z.number().int().positive(),
            rang_huur_meer: z.number().int().positive(),
            bron: z.string(),
          })
          .strict(),
      })
      .strict()
      .nullable(),
    gemeenten: z
      .array(
        z
          .object({
            code: z.string().regex(/^\d{4}$/),
            naam: z.string(),
            provincie: z.string(),
            inwoners: z.number().int().positive().nullable(),
            ozb: euro,
            afval_een: euro,
            afval_meer: euro,
            riool_een: euro,
            riool_meer: euro,
            korting_een: euro,
            korting_meer: euro,
            koop_een: euro,
            koop_meer: euro,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type Woonlasten = z.infer<typeof woonlastenSchema>;

// ---------- spel/route.json ----------

export const routeSchema = z
  .object({
    toelichting: z.string(),
    /** de kaart bij het begin, vóór stap 1; {vrij} wordt ingevuld */
    intro: z.object({ kop: z.string(), tekst: z.string(), knop: z.string() }).strict(),
    /** na de laatste stap */
    klaar: z.object({ kop: z.string(), tekst: z.string() }).strict(),
    stappen: z
      .array(
        z
          .object({
            gebouw: z.string(),
            /** het onderwerp van de stap, zoals "Veiligheid" */
            thema: z.string(),
            /** een korte zin over wat je hier kiest */
            vraag: z.string(),
            /** het standpunt van VVD Groningen; leeg tot de fractie het aanlevert */
            vvd: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type Route = z.infer<typeof routeSchema>;

// ---------- belastingen-nederland-JJJJ.json ----------

export const belastingenNederlandSchema = z
  .object({
    /** het jaar van de cijfers; de game zegt er altijd bij dat het niet de begroting van de game is */
    jaar: z.number().int(),
    toelichting: z.string(),
    bronnen: z.array(woonlastenBron).min(1),
    /** inwoners van de eigen gemeente op 1 januari van dat jaar */
    inwoners: z.number().int().positive(),
    /** per belasting (id uit de begroting): de gemiddelden in euro per inwoner */
    belastingen: z.record(
      z.string(),
      z
        .object({
          nederland: euro,
          /** gemeenten van dezelfde grootte als de eigen gemeente */
          grootteklasse: euro.optional(),
          /** wat de CBS-cijfers meetellen, als dat anders is dan de post in de game */
          let_op: z.string().optional(),
        })
        .strict(),
    ),
    /** de grootteklasse in gewone taal, bijvoorbeeld "gemeenten met 150.000 tot 250.000 inwoners" */
    grootteklasse: z.string(),
  })
  .strict();
export type BelastingenNederland = z.infer<typeof belastingenNederlandSchema>;

// ---------- uitgaven-gemeenten-JJJJ.json ----------

const taakveld = z.string().regex(/^\d\.\d+$/, 'een taakveld zoals "5.1" (Iv3)');

export const uitgavenSchema = z
  .object({
    /** het jaar van de cijfers; de game zegt er altijd bij dat het niet het jaar van de begroting is */
    jaar: z.number().int(),
    /** uit welk soort stuk de cijfers komen */
    verslagsoort: z.enum(['begroting', 'jaarrekening']),
    toelichting: z.string(),
    definitie: z.string(),
    bronnen: z.array(woonlastenBron).min(1),
    /** de eigen gemeente (CBS-code zonder GM) */
    gemeente: z.string().regex(/^\d{4}$/),
    /** deze gemeenten staan standaard in de lijst; de rest na "alle gemeenten" */
    vergelijk_met: z.array(z.string().regex(/^\d{4}$/)),
    /** welke gemeenten meedoen, in gewone taal (voor de tekst in de game) */
    groep: z.string(),
    themas: z
      .array(
        z
          .object({
            id: z.string().min(1),
            naam: z.string(),
            /** bij welke gebouwen de vergelijking staat */
            gebouwen: z.array(z.string()).min(1),
            taakvelden: z.array(taakveld).min(1),
            /** waarom de vergelijking niet een-op-een is, in gewone taal */
            let_op: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
    gemeenten: z
      .array(
        z
          .object({
            code: z.string().regex(/^\d{4}$/),
            naam: z.string(),
            inwoners: z.number().int().positive(),
            /** lasten per thema, in duizenden euro's */
            lasten_x1000: z.record(z.string(), z.number()),
          })
          .strict(),
      )
      .min(2),
  })
  .strict();
export type Uitgaven = z.infer<typeof uitgavenSchema>;

// ---------- spel/personas.json ----------

export const personaSchema = z
  .object({
    id: z.string().min(1),
    naam: z.string(),
    leeftijd: z.number().int().nullable(),
    buurt: z.string().regex(/^BU\d{8}$/),
    gebied: z.string().min(1),
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
