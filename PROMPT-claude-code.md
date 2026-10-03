# Opdracht: bouw de Begrotingsgame van de gemeente Groningen

Je bent Claude Code. In deze map vind je alles wat je nodig hebt om een echte, gecodeerde game te bouwen. In die game maken inwoners van de gemeente Groningen hun eigen tegenbegroting. Lees dit hele document voordat je begint. Werk daarna fase voor fase (zie hoofdstuk 13), en stel aan het begin de open vragen uit hoofdstuk 15.

---

## 1. Context en doel

**Opdrachtgever:** Rik Heiner, fractievoorzitter van de VVD Groningen in de gemeenteraad van Groningen.

**Doel:** inwoners laten ervaren hoe een gemeentebegroting werkt, en wat de gevolgen zijn als je keuzes maakt. Elke euro kan maar één keer worden uitgegeven. Wie ergens geld weghaalt, ziet wat de gemeente dan niet meer doet. Wie investeert, moet dat eerst ergens anders vrijmaken. Aan het eind rolt er automatisch een complete, eigen tegenbegroting uit de game, in de vorm van de tegenbegroting die de fractie zelf indient. De fractie haalt zo input op voor bezuinigingen en investeringen.

**Doelgroep:** inwoners van 16 jaar en ouder in de hele gemeente: stad, Haren, Ten Boer, Meerstad, Hoogkerk en de dorpen. Het merendeel speelt op een telefoon, via een link op social media of in een nieuwsbrief. Ze hebben geen kennis van begrotingen.

**Gevoel:** een Sims- of SimCity-achtige game op de echte kaart van de gemeente. Speels, met gebouwen die reageren, poppetjes die rondlopen en praten, muntjes die naar een geldpotje vliegen en een slotje op de pot. Onder die speelse laag zit een eerlijke en controleerbare rekenmotor met echte begrotingscijfers.

**Belangrijk:** de begroting 2027 is nog niet verschenen. Bouw alles met de begroting 2026 en de VVD-tegenbegroting 2026 als testcase. De data moet volledig los staan van de code, zodat een nieuwe begroting zonder codewijzigingen kan worden ingeladen (zie hoofdstuk 14 en `UPDATE-BEGROTING.md`).

---

## 2. Wat er al ligt

| Bestand | Wat het is | Hoe je het gebruikt |
|---|---|---|
| `prototype/begrotingsgame-prototype.html` | Werkend prototype in één HTML-bestand. Bevat de gemeentekaart, gebouwen, schuiven, het geldpotje met slot, reacties van inwoners, missies, het eindscherm en de export naar een tegenbegroting (Word). | Referentie voor gedrag, teksten en sfeer. Niet de code overnemen: herbouw het netjes volgens deze opdracht. Open het in een browser om te zien hoe het voelt. |
| `data/begroting-2026.json` | Begrotingsdata 2026: totalen, kengetallen, 4 programma's, 14 deelprogramma's (lasten en baten 2026 t/m 2029), 89 onderdelen met lasten en gekoppelde baten, 5 belastingen en 16 actiekaarten. Inclusief spelontwerp per onderdeel: min/max, vergrendeling, wettelijke taak, meters, teksten. | De enige bron van bedragen in de game. Geen bedrag hardcoderen. |
| `data/dwarsverbanden.json` | 67 dwarsverbanden tussen inkomsten en uitgaven, in 13 categorieën. Per verband: mechanisme, formule, parameters (met status feit, aanname of te onderzoeken), vertraging, richting, meters en de melding voor de speler. | De tweede kern van de rekenmotor (hoofdstuk 7). |
| `data/tegenbegroting-vvd-2026.json` | Alle posten van de VVD-tegenbegroting 2026, met S/I, koppeling naar game-ids, controletotalen en bekende afwijkingen. | Testcase voor de rekenmotor en vergelijking op het eindscherm. |
| `data/gemeente-groningen-wijken.geojson` | De 20 wijken van de gemeente (CBS 2024 via PDOK, WGS84). | Basis voor de kaart. |
| `data/gemeente-groningen-buurten.geojson` | De 151 buurten van de gemeente (CBS 2024 via PDOK, WGS84). | Voor detail op de kaart en voor "Wat betekent het voor mijn buurt". |
| `UPDATE-BEGROTING.md` | Werkwijze om een nieuwe begroting in te laden. | Bouw de tooling die daar wordt beschreven (hoofdstuk 14). |

Originele bronnen: de ontwerpbegroting 2026 (boekwerk) staat op `https://gemeenteraad.groningen.nl/Documenten/Bijlage-2-Ontwerpbegroting-2026-boekwerk.pdf` en de VVD-tegenbegroting staat op de website van de gemeenteraad (zie de url in de JSON).

---

## 3. Harde principes

Deze principes gelden altijd. Als iets in dit document ermee botst, wint dit hoofdstuk.

1. **Data-gedreven.** Elk bedrag, elke post, elke tekst voor een post, elk dwarsverband en elke parameter komt uit JSON in `data/`. De code kent geen begrotingsbedragen. Een nieuwe begroting is een nieuw databestand, geen codewijziging.
2. **Een losse, geteste rekenmotor.** De rekenmotor is pure TypeScript zonder UI, zonder DOM en zonder React. Hij krijgt data en keuzes en geeft resultaten terug. Hij is deterministisch en volledig getest. De game is alleen een weergave daarvan.
3. **Eerlijk over zekerheid.** Een bedrag uit de begroting is een feit. Een kettingeffect of meter is een aanname of een spelregel. Laat dat verschil altijd zien: elk effect met status "aanname" krijgt een herkenbaar label ⚠︎ met de uitleg erbij. Parameters met status "te onderzoeken" en zonder waarde rekenen niet mee en worden getoond als "nog niet doorgerekend".
4. **Structureel en incidenteel apart.** De begroting moet structureel sluitend zijn. Eenmalig geld mag geen vaste lasten dekken. De game dwingt dat af en legt het uit.
5. **Meerjarig denken.** De speler ziet niet alleen het eerste jaar, maar de hele meerjarenraming (nu 2026 t/m 2029). Vertraagde effecten, ingroeipaden en terugkerende gaten zijn zichtbaar.
6. **Beide kanten laten zien.** Elke keuze heeft voor- en nadelen. Inwoners reageren positief én negatief. De game neemt geen standpunt in; de uitkomst is aan de speler. De afzender (VVD-fractie) staat duidelijk in het colofon.
7. **Taal.** Nederlands op B1-niveau. Gebruik overal **"gemeente"** en niet "stad", behalve in eigennamen (Stadhuis, Stadsschouwburg, Stadspark, Stadsbeheer). Actieve zinnen, zinsnaamval (sentence case), geen jargon zonder uitleg.
8. **Mobiel eerst, voor iedereen.** Goed speelbaar op een telefoon van 360 pixels breed, ook met één hand. WCAG 2.1 AA: toetsenbordbediening, schermlezer, voldoende contrast, `prefers-reduced-motion` respecteren. De kaart heeft een volwaardig alternatief als lijst.
9. **Privacy by design.** Spelen kan zonder account en zonder persoonsgegevens. Geen tracking-cookies. Insturen gebeurt alleen na expliciete toestemming (hoofdstuk 11).
10. **Geen AI tijdens het spelen.** De game gebruikt geen taalmodel op de achtergrond. Alle teksten komen uit de data en uit sjablonen.
11. **Snel.** Eerste weergave binnen 2 seconden op 4G. De game werkt daarna ook offline (PWA).

---

## 4. Techniek en architectuur

### 4.1 Stack

- **Vite + React 18 + TypeScript** (`strict: true`, geen `any`).
- **PixiJS v8** voor de gemeentekaart, gebouwen, poppetjes en animaties (WebGL, met canvas-fallback). Gebruik `@pixi/react` of een eigen dunne brug. De UI (panelen, schuiven, knoppen, eindscherm) is gewone React met HTML en CSS, over de kaart heen.
- **Zustand** voor de toestand van de speler. Keuzes in de URL (gecomprimeerd, bijvoorbeeld met `lz-string`), zodat een begroting als link te delen is.
- **Zod** voor schema's en validatie van alle JSON.
- **d3-geo** om de GeoJSON te projecteren. Gebruik een vaste projectie (bijvoorbeeld Mercator, gecentreerd op de gemeente) en daarna een radiale vergroting van het centrum (zie 8.2).
- **docx** (npm) voor de Word-export, en een printvriendelijke HTML-weergave voor PDF (via `window.print()` en print-CSS). Overweeg `@react-pdf/renderer` alleen als print-CSS niet goed genoeg is.
- **Vitest** voor unit tests van de rekenmotor. **Playwright** voor end-to-end tests en screenshots op mobiel en desktop.
- **vite-plugin-pwa** voor offline gebruik.
- Backend voor inzendingen (fase 5): **Supabase** in een EU-regio (Postgres, row level security, een edge function voor validatie en rate limiting). Geen accounts voor spelers.
- Hosting: statisch, bijvoorbeeld Netlify of Vercel, met een eigen domein.
- Analytics, als ze gewenst zijn: cookieloos en EU-gehost (Plausible of een eigen Umami).

### 4.2 Mapstructuur

```
begrotingsgame/
  data/
    begroting-2026.json
    dwarsverbanden.json
    tegenbegroting-vvd-2026.json
    gemeente-groningen-wijken.geojson
    gemeente-groningen-buurten.geojson
    spel/
      gebouwen.json          # gebouwen, plek op de kaart, welke onderdelen erbij horen
      personas.json          # inwoners en hun behoeften
      reacties.json          # regels voor tekstballonnen
      missies.json
      gebeurtenissen.json    # gebeurteniskaarten
      teksten.json           # UI-teksten, tutorial, uitleg
    mappings/
      id-mapping-2026-2027.json   # later, bij nieuwe begroting
  src/
    engine/                  # PURE rekenmotor, geen imports uit UI
      schema.ts              # Zod-schema's en afgeleide types
      laadData.ts
      rekenen.ts             # hoofdfunctie bereken()
      dwarsverbanden.ts
      meerjarig.ts
      meters.ts
      regels.ts              # sluitend, wettelijke grenzen, slot van de pot
      uitleg.ts              # 'waarom'-trace per bedrag
      scenario.ts            # voorzichtig / midden / optimistisch
      __tests__/
    game/
      kaart/                 # Pixi: projectie, wijken, wegen, gebouwen, poppetjes
      state/                 # Zustand-store, URL-sync
      missies/
      gebeurtenissen/
    ui/
      hud/                   # geldpotje, saldo's, meters, missiebalk
      panelen/               # gebouwpaneel met schuiven, belastingloket, veilinghuis
      eindscherm/
      tegenbegroting/        # documentweergave, export docx/pdf/png
      lijstweergave/         # toegankelijk alternatief voor de kaart
      tutorial/
    app/
  scripts/
    data-check.ts            # validatie van alle data (hoofdstuk 14)
    data-diff.ts             # verschillen tussen twee begrotingsjaren
    vvd-check.ts             # rekent de VVD-tegenbegroting na
  tests/e2e/
```

### 4.3 Configuratie

`data/config.json` bepaalt het actieve begrotingsjaar en welke bestanden daarbij horen:

```json
{
  "actiefJaar": 2026,
  "begroting": "begroting-2026.json",
  "vergelijking": ["tegenbegroting-vvd-2026.json"],
  "meerjarenHorizon": [2026, 2027, 2028, 2029],
  "scenario": "midden"
}
```

---

## 5. Datamodel

Maak Zod-schema's die precies passen bij de bestaande JSON-bestanden, en leid daar de TypeScript-types van af. Pas de JSON niet stilzwijgend aan: breid het schema uit waar nodig en documenteer elke uitbreiding in `data/SCHEMA.md`.

### 5.1 Begroting (`begroting-JJJJ.json`)

Belangrijkste velden (zie het bestand voor de volledige vorm):

- `totalen` en `kengetallen_2026`: in duizenden euro's.
- `deelprogrammas[]`: `code` (bijvoorbeeld "3.1"), `naam`, `lasten_x1000` en `baten_x1000` per jaar.
- `onderdelen[]`: de schuiven.
  - `id` (stabiel, zie 5.4), `naam`, `deelprogramma`, `gebouw`
  - `lasten_mln`, `gekoppelde_baten_mln`: inkomsten die meebewegen als je de post aanpast (rijksgeld, leges, kaartverkoop)
  - `min_pct`, `max_pct`, `vergrendeld`, `reden_vergrendeld`, `doorgeefluik_heffing`, `wettelijke_taak`
  - `meters`: gewichten per meter
  - `tekst_bezuinigen`, `tekst_investeren`, `bron`
- `belastingen[]`: `id`, `naam`, `opbrengst_mln`, `min_pct`, `max_pct`, `voelbaarheid_portemonnee`, `uitleg`.
- `actiekaarten[]`: losse maatregelen (verkopen, projecten stoppen, investeren), met `structureel_of_incidenteel`, `bedrag_mln` en `meter_effect_punten`.

Voeg in het schema deze velden toe (optioneel, met standaardwaarde), zodat de rekenmotor meerjarig kan werken:

- `ingroeipad`: bijvoorbeeld `[0.25, 1, 1, 1]`: welk deel van de besparing per jaar wordt gehaald. Standaard `[1,1,1,1]`.
- `investering`: `{ bedrag_mln, levensduur_jaar, eenmalige_bijdrage: boolean }` voor actiekaarten die een investering zijn (hoofdstuk 7, `fin_kapitaallasten`).
- `lasten_per_jaar_mln`: als een post in de meerjarenraming verandert.

### 5.2 Dwarsverbanden (`dwarsverbanden.json`)

Per dwarsverband: `id`, `categorie`, `naam`, `van[]`, `naar[]`, `mechanisme`, `formule` (leesbare pseudo-formule), `parameters` (`{waarde, eenheid, status, toelichting}`), `vertraging_jaren`, `richting` (`beide`, `bezuiniging`, `investering`, `groei`, `regel`, `gebeurtenis`), `meters`, `melding`, `bron`.

De formules in de JSON zijn beschrijvingen, geen code. Zet elk dwarsverband om naar een getypeerde TypeScript-functie in `engine/dwarsverbanden.ts` die de parameters uit de JSON leest. Registreer ze in een tabel op `id`. Een dwarsverband in de JSON zonder implementatie geeft een waarschuwing in `data-check` en doet niets in de game.

### 5.3 Spelontwerp-data (`data/spel/*.json`)

- **`gebouwen.json`:** `id`, `naam`, `thema`, `icoon`, `wijk` (verwijzing naar de wijkcode in de GeoJSON), `positie` (lengte- en breedtegraad of een offset in kaarteenheden), `onderdelen[]`, `soort` (`gebouw`, `park`, `loket`, `veilinghuis`, `landmark`). Neem de 14 gebouwen uit het prototype over, met hun locatie: Stadhuis met Martinitoren in het centrum, Winkelstraat in Oud-West, Parkeergarage in Oud-Noord, Werkplein in Noordwest (Vinkhuizen), Zwembad in Noordoost (Kardinge), Buurthuis in Noorddijk (Beijum/Lewenborg), Zorgcentrum in de Oosterparkwijk, Politie en boa's in Zuidoost, Schouwburg in Oud-Zuid, School in Helpman, Park in Zuidwest (Stadspark), Nieuwbouw in Meerstad, Veilinghuis bij Ten Boer en Belastingloket bij Haren.
- **`personas.json`:** zie 8.5.
- **`reacties.json`:** regels voor tekstballonnen: `{voorwaarde, tekst, persona?, gewicht}`. De voorwaarde is een kleine, veilige expressie over de toestand (bijvoorbeeld `pct.o1 <= -25`). Schrijf een eigen parser; gebruik nooit `eval`.
- **`missies.json`**, **`gebeurtenissen.json`**, **`teksten.json`:** zie hoofdstuk 8.

### 5.4 Stabiele ids

Ids blijven over de jaren hetzelfde, ook als de naam van een post verandert. Een nieuwe post krijgt een nieuw id. Een post die verdwijnt, blijft in de mapping met `vervallen: true`. De mapping tussen jaren staat in `data/mappings/`. Zo blijven dwarsverbanden, reacties, missies en gedeelde links werken als er een nieuwe begroting komt.

---

## 6. De rekenmotor

### 6.1 Interface

```ts
type Keuzes = {
  onderdelen: Record<string, number>;   // id -> percentage (-100..+100), 0 = ongewijzigd
  belastingen: Record<string, number>;  // id -> percentage
  kaarten: string[];                    // actieve actiekaarten
  scenario: 'voorzichtig' | 'midden' | 'optimistisch';
  gebeurtenissen?: string[];            // opgetreden gebeurtenissen (campagnemodus)
};

type Resultaat = {
  perJaar: Record<Jaar, {
    structureel: number;    // saldo t.o.v. de begroting, mln
    incidenteel: number;
    lasten: number;
    baten: number;
    perDeelprogramma: Record<string, { lasten: number; baten: number }>;
  }>;
  meters: Record<MeterId, number>;           // 0..100, 50 = huidige begroting
  personas: Record<PersonaId, number>;        // tevredenheid 0..100
  effecten: Effect[];                         // alle directe en indirecte effecten
  meldingen: Melding[];                       // wat de speler te zien krijgt
  regels: { sluitend: boolean; perJaarSluitend: Record<Jaar, boolean>; overtredingen: string[] };
  weerstandsvermogen: number;
};

type Effect = {
  bron: string;          // onderdeel-, belasting-, kaart- of dwarsverband-id
  doel: string;          // waar het geld landt
  bedrag: number;        // + = gunstig voor de gemeente
  jaar: Jaar;
  soort: 'S' | 'I';
  zekerheid: 'feit' | 'aanname' | 'te onderzoeken';
  uitleg: string;        // voor de 'Waarom?'-knop
};

function bereken(data: Data, keuzes: Keuzes): Resultaat;
function magWijzigen(data: Data, huidig: Keuzes, nieuw: Keuzes): { ok: boolean; reden?: string };
```

### 6.2 Volgorde van rekenen (per jaar)

1. **Directe effecten.** Per onderdeel: `besparing = -pct/100 * (lasten - gekoppelde_baten) * ingroeipad[jaar]`. Per belasting: `pct/100 * opbrengst`. Per actiekaart: het bedrag, S of I. Voor een investering de kapitaallasten over de levensduur, behalve bij een eenmalige bijdrage.
2. **Grenzen.** Pas `min_pct` en `max_pct` toe. Vergrendelde posten en doorgeefluiken (afval, riool) veranderen het saldo niet.
3. **Dwarsverbanden.** Bouw een gerichte graaf van `van` naar `naar`. Reken in topologische volgorde. Is er een kring, dan reken je die één keer door en meld je dat in `data-check`. Elk dwarsverband levert `Effect`-regels op, met vertraging en ingroei per jaar. Gebruik de parameterwaarde die hoort bij het gekozen scenario (zie 6.4).
4. **Meters en personas** (hoofdstuk 8.4 en 8.5).
5. **Regels.** Structureel sluitend in elk jaar van de horizon. Incidenteel mag niet worden gebruikt om structurele lasten te dekken. Het weerstandsvermogen mag niet onder de ondergrens zakken.
6. **Uitleg.** Elk getal op het scherm moet terug te voeren zijn op een lijst `Effect`-regels. De knop "Waarom?" toont die lijst in gewone taal.

### 6.3 Het slot op de pot

`magWijzigen` staat een wijziging toe als het structurele saldo daarna ≥ 0 blijft in elk jaar, of als de wijziging het saldo niet verslechtert. Meer uitgeven of een belasting verlagen kan dus alleen als er eerst geld is vrijgemaakt. Structurele uitgaven vragen structurele dekking. Eenmalige uitgaven mogen worden gedekt met structureel en eenmalig geld samen. Bij een weigering krijgt de speler een concrete reden ("Hiervoor heb je nog € 2,3 mln structurele dekking nodig").

### 6.4 Scenario's voor aannames

Elke parameter met status "aanname" krijgt in de data een bandbreedte: `waarde` is het midden. Voeg `laag` en `hoog` toe; standaard is dat 50% en 150% van de waarde, tenzij de toelichting een andere bandbreedte noemt. De speler kan bovenin kiezen tussen **voorzichtig**, **midden** en **optimistisch**. Het eindscherm laat zien hoe gevoelig de uitkomst is voor die keuze.

### 6.5 Afronding en weergave

Reken intern in euro's als `number`, rond alleen af bij weergave: miljoenen met één decimaal in de game en drie decimalen in het financiële overzicht. Gebruik Nederlandse notatie (`€ 1.482,0 mln`, komma als decimaalteken).

### 6.6 Verplichte tests (Vitest)

- **Nulscenario:** geen keuzes geeft saldo 0 in elk jaar en alle meters op 50.
- **Doorgeefluiken:** afval en riolering aanpassen verandert het saldo niet.
- **Gekoppelde baten:** parkeercontrole −100% kost netto geld (6,0 − 5,0 = −1,0 mln). Omgevingsvergunningen −50% kost netto geld. Energiesubsidies −100% levert maar 0,3 mln op.
- **Wettelijke grenzen:** jeugdzorg kan niet verder omlaag dan −10%.
- **Slot:** zonder vrijgemaakt geld kan geen enkele uitgave omhoog en geen belasting omlaag.
- **VVD-testcase:** reken `tegenbegroting-vvd-2026.json` na met posten als losse kaarten. De totalen moeten overeenkomen met `controle` in dat bestand. Leg de bekende afwijkingen vast in de test.
- **Meerjarig:** een subsidiebezuiniging met ingroeipad `[0.25, 1]` levert in jaar 1 een kwart op en daarna het hele bedrag. Eenmalig geld in 2026 dekt 2027 niet.
- **Dwarsverbanden:** per geïmplementeerd dwarsverband minstens één test met handmatig nagerekende uitkomst.
- **Determinisme:** dezelfde invoer geeft altijd dezelfde uitvoer.
- **Property-based** (met `fast-check`): het saldo is nooit NaN; de meters blijven binnen 0 tot 100.

---

## 7. Dwarsverbanden

`data/dwarsverbanden.json` is leidend. Hieronder staat per categorie waar het om gaat, zodat je begrijpt waarom ze bestaan. Implementeer ze allemaal. Als een formule onvoldoende gegevens heeft, bouw je het verband toch in en toon je het als "nog niet doorgerekend", met de uitleg.

**Kostendekkende heffingen.** Afval en riolering worden betaald uit de heffing: minder doen verlaagt de heffing, niet het tekort. Let op de overhead die via de heffing wordt gedekt. Leges (vergunningen, burgerzaken), bedrijfsafval, de autowerkplaats en de schouwburg hebben inkomsten die meebewegen. Soms kost bezuinigen daardoor netto geld. Entreeprijzen van zwembaden werken met een prijselasticiteit.

**Rijksgeld en geoormerkte middelen.** Veel posten worden betaald met geld van het Rijk dat aan een doel vastzit. Schrap je de uitgave, dan vervalt het rijksgeld ook. De BUIG (bijstandsbudget) is een vast budget: elke persoon minder in de bijstand is winst voor de gemeente.

**Gemeentefonds.** Het gemeentefonds rekent met een landelijk rekentarief voor de OZB. Een OZB-verlaging betaalt de gemeente dus volledig zelf. Meer woningen en inwoners leveren meer gemeentefonds op. Minder bijstandshuishoudens levert via die maatstaf iets minder op. Rijksbezuinigingen komen binnen als gebeurteniskaart.

**Werk, inkomen en armoede.** Re-integratie leidt tot uitstroom en daarmee tot minder bijstand, armoederegelingen, bijzondere bijstand en kwijtschelding. Basisbanen en loonkostensubsidie schrappen brengt mensen terug in de bijstand. De armoedeval werkt twee kanten op: minder regelingen vergroot de prikkel om te werken, maar ook de schulden. Kwijtschelding schrappen geeft oninbare posten en invorderingskosten. Een strengere tegenprestatie kost eerst uitvoeringsgeld. Inburgering verkort de tijd in de bijstand.

**Zorg en preventie.** Schuldhulp voorkomt bijzondere bijstand, huisuitzettingen en jeugdzorg. Preventie (WIJ, welzijn, onderwijskansen, sport, jeugdwerk) remt de groei van jeugdzorg en Wmo, met een vertraging van enkele jaren. Minder beschermd wonen en opvang geeft meer overlast. Huiselijk geweld, onderwijs en leerlingenvervoer hangen samen.

**Veiligheid en handhaving.** Boetes van boa's gaan naar het Rijk, niet naar de gemeente. Parkeercontrole levert wel geld op. Camera's en verlichting kosten elk jaar beheer en energie. Verloedering trekt verloedering aan. Ondermijning, verhuurderschap en vastgoed versterken elkaar. Evenementen vragen om toezicht.

**Openbare ruimte.** Achterstallig onderhoud wordt na een paar jaar duurder (hogere kapitaallasten, claims). Meer woningen betekent meer openbare ruimte om te onderhouden. Prullenbakken verminderen zwerfafval. Groen helpt tegen hitte en wateroverlast.

**Economie, parkeren en bezoekers.** Het parkeertarief heeft een prijselasticiteit en effect op de binnenstad, het autoverkeer en de fietsenstallingen. Bij gratis parkeren lopen de kosten van de garages door. Reclamezuilen leveren geld op. Cultuur en citymarketing trekken bezoekers, dus toeristenbelasting. Precario raakt terrassen en verbouwingen. De OZB voor woningen en niet-woningen moet een aparte schuif worden. Vastgoed verkopen levert eenmalig geld op, maar je mist daarna de huur.

**Wonen, groei en grond.** Sneller bouwen levert OZB, leges en gemeentefonds op, maar vraagt ook om scholen, zorg en openbare ruimte. De grondexploitatie van Meerstad heeft risico's. Verduurzaming van gemeentegebouwen verdient zich terug.

**Energie en deelnemingen.** WarmteStad verkopen levert eenmalig geld op, maar dividend en zeggenschap vallen weg. Zon- en windprojecten stoppen betekent gemiste opbrengsten later. Dividenden verdwijnen als je aandelen verkoopt.

**Organisatie en uitvoering.** Minder ambtenaren gaat via natuurlijk verloop (een besparing die groeit) of met frictiekosten. Minder capaciteit vertraagt andere plannen. AI verdient zich pas na een paar jaar terug. Minder bereikbaarheid geeft meer bezwaren. Minder wethouders betekent wachtgeld en gaat pas in na de verkiezingen.

**Financiering, reserves en tijd.** Investeren is niet hetzelfde als uitgeven: rekenen met afschrijving en rente. Eenmalig geld dekt geen vaste lasten. Reserves en het weerstandsvermogen. Rente en lenen. Tegenvallers als gebeurteniskaarten.

**Juridisch en contractueel.** Subsidies afbouwen kost een opzegtermijn. Wettelijke taken hebben een ondergrens. De bijdragen aan gemeenschappelijke regelingen bepaalt de gemeente niet alleen. Lopende contracten en aanbestedingen.

### 7.1 Hoe de speler dwarsverbanden ziet

- **Op de kaart:** een lijn licht op tussen het gebouw waar je iets aanpast en het gebouw waar het effect landt (bijvoorbeeld Werkplein naar Zorgcentrum). Er rollen muntjes over de lijn, groen voor voordeel en rood voor nadeel.
- **In het paneel:** onder elke schuif staat "Dit heeft ook effect op…" met de gekoppelde posten en bedragen, en een ⚠︎ bij aannames.
- **Melding:** de `melding` uit de JSON, als toast, maximaal één per wijziging en niet steeds dezelfde.
- **Waarom?:** bij elk bedrag in de HUD en in het eindscherm.
- **Meerjarig:** een klein grafiekje per jaar laat zien dat een effect later komt of later groeit.

---

## 8. Game design

### 8.1 De kern

1. Je komt direct in de gemeente, zonder startscherm. Er staat een korte titel boven de kaart: "Maak de begroting van de gemeente Groningen". Een tutorial met coachmarks legt het in drie stappen uit (8.8).
2. Je tikt op een gebouw. Er schuift een paneel omhoog met de posten van dat gebouw, elk met een schuif (−100% tot +max%). Je ziet direct wat het oplevert, wat er stopt of wat je krijgt, en welke dwarsverbanden er meespelen.
3. Het gebouw verandert zichtbaar, de poppetjes reageren, en het geldpotje vult zich of schudt als er geen geld in zit.
4. Als je begroting sluit, dien je hem in bij het Stadhuis (of via de knop "Indienen"). Het eindscherm toont de score, de meters, wat stopt en wat je terugkrijgt. Met één knop maak je je tegenbegroting.

### 8.2 De gemeentekaart

- Teken de 20 wijken uit de GeoJSON, met de gemeentegrens als dikke lijn in het blauw. Maak het centrum groter, zodat alle gebouwen passen: een radiale vergroting vanuit het centrum met `r' = R * (r / R)^0.55`. Het prototype doet dit al.
- Stijl: vriendelijk isometrisch, met platte kleuren en zachte schaduwen. Wijken in groentinten, water (Eemskanaal, Van Starkenborghkanaal, Hoornseplas, Paterswoldsemeer en Zuidlaardermeer aan de rand) in blauw. Namen van dorpen en wijken klein en rustig.
- Wegen lopen van het Stadhuis naar elk gebouw, zoals de radiale structuur van Groningen.
- Herkenbare elementen: Martinitoren bij het Stadhuis, molens bij Ten Boer, nieuwbouw met kranen in Meerstad, het Stadspark bij het Park. Houd gebouwen verder algemeen (geen echte logo's of merknamen).
- Knijpen en slepen om te zoomen en te verschuiven, met grenzen. Dubbeltik zoomt in op een wijk.
- **Tijd van de dag:** optioneel een langzame dag-nachtcyclus. 's Nachts is straatverlichting zichtbaar; met de kaart "Betere straatverlichting" wordt het lichter.
- **Lijstweergave:** een knop schakelt naar een toegankelijke lijst met alle gebouwen en posten. Die heeft dezelfde functies en werkt met een schermlezer.

### 8.3 Gebouwen en hun toestand

Elk gebouw heeft vijf toestanden, afgeleid van het gewogen gemiddelde percentage van zijn posten:

| Toestand | Drempel | Beeld |
|---|---|---|
| Bloeiend | > +15% | Glanzend, vlag, sterretjes, bouwkraan bij investeren |
| Beter | +3% tot +15% | Iets feller, bloembakken |
| Normaal | −4% tot +3% | Standaard |
| Versoberd | −30% tot −4% | Grauw, de helft van de ramen donker |
| Gesloten | ≤ −30% | Dichtgetimmerd, bord "GESLOTEN" |

Speciale gebouwen:

- **Park:** gaten in de weg en zwerfafval bij minder onderhoud, bloemen bij meer.
- **Zwembad:** water leeg en hek dicht bij −50%.
- **Belastingloket:** alle belastingschuiven. Munten uit de portemonnee van de poppetjes bij verhoging en terug bij verlaging.
- **Veilinghuis:** de actiekaarten, als kaarten die je omdraait. Verkopen gaat met een hamerklap.
- **Stadhuis:** hier dien je in. Het bevat ook de posten van bestuur en organisatie.

Een klein bedrag onder elk gebouw toont het netto-effect van dat gebouw.

### 8.4 Meters

Zes meters, elk van 0 tot 100, waarbij 50 de huidige begroting is: **Veilig**, **Schoon en heel**, **Zorg en vangnet**, **Werk**, **Sport en cultuur** en **Portemonnee**. Voeg **Wonen** en **Dienstverlening** toe, omdat de dwarsverbanden daar naar verwijzen.

- De berekening volgt het prototype: per meter het gewogen aandeel van de lasten van de betrokken, niet-vergrendelde posten. Daarbovenop komen de effecten van dwarsverbanden en kaarten. De gewichten staan in de data.
- De meters zijn uitdrukkelijk een spelregel en geen voorspelling. Zet dat bij de uitleg.
- **Blije inwoners** is het gemiddelde, met een gezichtje in vijf stappen.

### 8.5 Inwoners (persona's)

Acht persona's lopen als poppetjes over de kaart. Ze hebben elk een wijk, een situatie en gewichten op de meters en posten. Hun tevredenheid telt mee in de score, en op het eindscherm staat per persona wat hij of zij merkt van jouw begroting.

1. **Anne**, 21, student, huurt een kamer in Selwerd. Fietst veel, gaat naar festivals.
2. **Familie Bakker**, Beijum, bijstand, twee kinderen. Gebruikt minimaregelingen en kwijtschelding.
3. **Henk**, 52, eigenaar van een winkel in de binnenstad. Betaalt OZB, reclamebelasting en parkeergeld.
4. **Fatima**, 38, verpleegkundige in het UMCG, huurt in Lewenborg. Heeft een parkeervergunning.
5. **Meneer De Vries**, 78, woont zelfstandig in Haren. Gebruikt Wmo-hulp en het buurthuis.
6. **Jeroen en Sanne**, beiden 34, jong gezin met een koophuis in Meerstad. Hebben kinderopvang, school en sport nodig.
7. **Kees**, 60, melkveehouder bij Ten Boer. Aardbevingen en de dorpen zijn belangrijk voor hem.
8. **Sem**, 17, scholier in Hoogkerk. Zit op voetbal en zwemt graag.

Tekstballonnen komen uit `reacties.json`. Schrijf er minstens 120, verdeeld over alle posten en persona's, zowel positief als negatief. Voorbeelden uit het prototype: "Mijn zwembad is dicht 😢", "Mijn OZB-aanslag is lager 🎉", "Dankzij mijn coach heb ik werk! 💼", "Ik wacht al weken op mijn paspoort 🛂". Een ballon verschijnt om de 4 seconden boven een willekeurig poppetje, nooit twee keer achter elkaar dezelfde, en past in de persona (Kees zegt niets over de fietsenstalling in de binnenstad).

### 8.6 Missies, campagne en gebeurtenissen

**Vrij spel** is de standaard. Een missie kies je bovenin.

Missies (minstens deze):

1. **Het slot van de pot** (tutorial): maak € 1 mln vrij en investeer die.
2. **Lagere lasten:** verlaag de OZB met minstens 10% en houd de begroting sluitend.
3. **Veilige gemeente:** veiligheidsmeter boven 70.
4. **Iedereen aan het werk:** werkmeter boven 70.
5. **Schoon en heel:** schoon-meter boven 70 zonder de lasten te verhogen.
6. **Gezond huishoudboekje:** weerstandsvermogen omhoog naar 200% in 2029.
7. **Bouwen, bouwen, bouwen:** 1.000 extra woningen in de meerjarenraming.
8. **Iedereen blij:** alle persona's boven 50.

**Campagnemodus:** vier rondes, van 2026 tot en met 2029. Elke ronde trek je één of twee **gebeurteniskaarten** en moet je bijsturen. Wat je eerder koos, werkt door (vertraagde effecten). Aan het eind volgt een score over de hele periode.

Gebeurteniskaarten (minstens 15, met bedragen als scenario, niet als voorspelling): meer vraag naar jeugdzorg, een nieuwe cao voor ambtenaren, een strenge winter (gladheidsbestrijding), een meevallende meicirculaire, een korting van het Rijk op het gemeentefonds, extra kosten voor aardbevingsversterking of juist extra rijksgeld via Nij Begun, hogere energieprijzen, een hogere rente, een failliete zorgaanbieder, een groot evenement dat naar Groningen komt, een brug die sneller vervangen moet worden, meer statushouders, een stijging van de bouwkosten, een rechterlijke uitspraak over de Wmo en een extra dividend.

**Score:** maximaal vijf sterren, voor sluitend in alle jaren, missie gehaald, structureel gezond (≥ € 5 mln over), geen eenmalig geld voor vaste lasten, en alle meters boven 40. Plus badges, zoals Zuinige Zuiderling, Buurthuisheld, Woningbouwer en Stadhuisslanker.

### 8.7 Geluid en animatie

- Korte geluiden (muntjes, hamerklap, slot open, bouwgeluid) via Howler.js. Standaard uit, met een knop om ze aan te zetten.
- Eén opvallende animatie per actie. Geen doorlopende animaties die afleiden. Met `prefers-reduced-motion` staan alle bewegingen stil, behalve directe feedback.

### 8.8 Tutorial zonder startscherm

Drie coachmarks bij het eerste bezoek: (1) "Dit is jouw gemeente. Tik op een gebouw." (2) "Schuif naar links om te bezuinigen. Het geldpotje vult zich." (3) "Nu is het slot eraf. Investeer ergens, of verlaag een belasting." Te overslaan, en daarna niet meer tonen (localStorage).

### 8.9 Eindscherm

- Kop: "Missie geslaagd!" of "Je begroting is ingediend", met sterren.
- Saldo structureel en incidenteel, per jaar als kleine grafiek.
- Badges, meters en persona's (met een zin per persona: "Familie Bakker gaat er € 40 per maand op achteruit door…"). Gebruik alleen bedragen die de rekenmotor kan onderbouwen; anders een kwalitatieve zin.
- "Dit doet de gemeente niet meer" en "Hier krijg je meer voor terug".
- Scenariogevoeligheid: "Met voorzichtige aannames houd je € X over, met optimistische € Y."
- **Vergelijking:** jouw keuzes naast de begroting van het college en de VVD-tegenbegroting (tabel en staafgrafiek per thema). Deze vergelijking is aan of uit te zetten in `config.json`.
- Velden: titel, naam (optioneel), eigen idee (vrij tekstveld).
- Knoppen: **Maak mijn tegenbegroting**, **Deel mijn begroting** (link en afbeelding), **Stuur in naar de fractie** (fase 5), **Terug naar de gemeente** en **Opnieuw spelen**.

### 8.10 De tegenbegroting die uit de game rolt

Dit is een kernfunctie. De opbouw volgt de VVD-tegenbegroting "Het kan en moet anders":

1. **Voorblad:** "Tegenbegroting", de eigen titel, "Op de ontwerpbegroting 2026 van de gemeente Groningen", en de naam.
2. **Inleiding:** een sjabloontekst met de rode draad. Hoeveel vrijgemaakt, hoeveel ingezet, de drie grootste keuzes, en het saldo.
3. **Besparingen en opbrengsten:** per thema (Bestuur en organisatie, Werk en inkomen, Cultuur, enzovoort), met per maatregel "▶ **Naam (−20%).** Toelichting." De toelichting komt uit `tekst_bezuinigen` of `uitleg`.
4. **Investeringen en lastenverlichting:** idem.
5. **Kettingeffecten:** apart, met de ⚠︎-uitleg bij aannames.
6. **Mijn eigen ideeën.**
7. **Gevolgen voor de gemeente:** de meters en persona's in een tabel.
8. **Financieel overzicht:** twee tabellen zoals in de VVD-tegenbegroting: "Ombuigingen en opbrengsten (x € 1 miljoen)" en "Uitgaven (x € 1 miljoen)", met de kolommen Omschrijving, 2026 en S/I, plus totalen en het saldo structureel en eenmalig. Voeg een meerjarentabel toe (2026 t/m 2029).
9. **Bronvermelding** en uitleg van S en I.

Exporteer naar **Word (.docx)** met echte koppen en tabellen (oranje kop, blauwe titels), naar **PDF** via printweergave, en naar een **afbeelding** (PNG, 1080×1350) met de hoofdpunten, voor social media. Bestandsnaam op basis van de titel. Het prototype heeft een werkende docx-export als referentie.

### 8.11 Persoonlijke impact ("Wat betekent het voor mij?")

Een optioneel paneel waarin de speler een paar vragen beantwoordt, zonder dat iets wordt opgeslagen: koop of huur, WOZ-waarde (met de gemiddelde waarde van € 340.000 als standaard), auto en parkeervergunning, kinderen, en inkomen boven of onder het sociaal minimum. De game rekent uit wat de keuzes voor dit huishouden betekenen: OZB, heffingen, parkeren en kwijtschelding. Alleen voor posten waarvan het tarief in de data staat. Voeg daarvoor de tarieven uit de paragraaf lokale heffingen van de begroting toe aan de data.

---

## 9. Vormgeving

- **Kleuren (uit het prototype):** blauw `#1233C4`, oranje `#FF6A00`, inkt `#15193A`, achtergrond `#F6F7FC`, positief `#15875A`, negatief `#C4321E`, gras `#A9DB8A`/`#98D077`, water `#4A9FD8`. Met een donkere modus.
- **Letters:** Baloo 2 voor titels en getallen in de HUD, Asap voor tekst. Als de VVD-huisstijl een eigen letter voorschrijft, vraag daar dan naar (hoofdstuk 15).
- **Knoppen:** dik en tastbaar, met een 3D-rand die indrukt. Minimaal 44×44 pixels.
- **HUD bovenaan, altijd zichtbaar:** geldpotje met slot, saldo structureel, saldo eenmalig, blije inwoners, en een missiebalk met de knop Indienen.
- **Paneel:** een bottom sheet op mobiel, een zijpaneel op desktop.
- Een duidelijk colofon: "Een initiatief van VVD Groningen", met de bronnen en de uitleg over aannames.

---

## 10. Inhoudsregels

- Schrijf alle teksten in het Nederlands, op B1-niveau.
- "Gemeente", niet "stad", behalve in eigennamen.
- Bedragen altijd met bron. Geen bedragen verzinnen. Als een getal ontbreekt, is dat zichtbaar ("nog niet doorgerekend").
- Geen echte namen van ambtenaren, wethouders of andere raadsleden. Geen verzonnen citaten van echte personen.
- Reacties en teksten zijn niet kwetsend over groepen (bijvoorbeeld bijstandsgerechtigden, statushouders of kunstenaars). Laat gevolgen zien, geen oordelen.
- Wettelijke taken en vaste bijdragen duidelijk markeren met 🔒 en een uitleg.

---

## 11. Privacy, veiligheid en juridisch

- Spelen kan zonder account. De keuzes staan in de browser en in de deelbare URL.
- **Insturen (fase 5):** alleen na een duidelijke toestemmingsvraag. Sla alleen op: keuzes, eigen idee, optioneel een wijk (niet verplicht), optioneel een e-mailadres als de speler op de hoogte wil blijven (met een aparte toestemming). Geen IP-adressen in de database.
- Een privacyverklaring op B1-niveau, een bewaartermijn (bijvoorbeeld 2 jaar), en een verwerkersovereenkomst met de hostingpartij.
- Rate limiting en een eenvoudige spamfilter op inzendingen. Controleer eigen ideeën op scheldwoorden en persoonsgegevens voordat ze ergens worden getoond.
- Beveiliging: een Content Security Policy, geen inline scripts in productie, en row level security in Supabase.
- Toegankelijkheid volgens WCAG 2.1 AA. Voeg een toegankelijkheidsverklaring toe.

---

## 12. Kwaliteit

- **CI** (GitHub Actions): lint, typecheck, `data-check`, Vitest en Playwright bij elke push.
- **Playwright-scenario's:** een eerste bezoek met tutorial, bezuinigen en daarna investeren, het slot van de pot, indienen, Word downloaden, de lijstweergave met alleen het toetsenbord, en een deellink openen. Maak screenshots op 360×800, 390×844 en 1440×900, en controleer ze.
- **Lighthouse:** 90 of hoger voor prestaties, toegankelijkheid en best practices op mobiel.
- **Bundel:** de eerste JavaScript-bundel onder 250 kB gzip. Laad de Word-export en de kaart-assets pas wanneer ze nodig zijn.
- **Browsers:** de laatste twee versies van Safari (iOS), Chrome (Android) en Firefox.

---

## 13. Fasering

Werk per fase. Commit na elke deelstap met een duidelijke commitboodschap. Sluit elke fase af met een korte samenvatting voor Rik: wat er werkt, hoe je het bekijkt, en welke vragen er zijn. Ga pas door na zijn akkoord.

**Fase 0: opzet.** Repository, Vite, TypeScript, lint, formattering, Vitest, Playwright en CI. `config.json`. Een lege pagina die het actieve begrotingsjaar laadt.
*Klaar als:* `npm run dev`, `npm test` en `npm run build` werken, en de CI is groen.

**Fase 1: data en rekenmotor.** Zod-schema's voor alle data, `data-check`, `vvd-check`, de rekenmotor met directe effecten, grenzen, het slot en meerjarig rekenen. Daarna alle dwarsverbanden, met scenario's en de uitleg-trace. Alle tests uit 6.6.
*Klaar als:* alle tests slagen, `data-check` geeft geen fouten, en er is een eenvoudige debugpagina met schuiven en een tabel met uitkomsten.

**Fase 2: gemeentekaart.** Projectie en vergroting, de wijken, water, wegen, de 14 gebouwen met vijf toestanden, poppetjes die lopen, tekstballonnen, zoomen en verschuiven, en de lijstweergave.
*Klaar als:* het er op een telefoon minstens zo goed uitziet als het prototype, met 60 fps op een middenklasse telefoon.

**Fase 3: speelbare game.** HUD, panelen, belastingloket, veilinghuis, geldpotje met animaties, meldingen, dwarsverbanden op de kaart, tutorial, missies, eindscherm, geluid, deellink en PWA.
*Klaar als:* alle Playwright-scenario's slagen.

**Fase 4: tegenbegroting.** De documentweergave, en de export naar Word, PDF en afbeelding.
*Klaar als:* de export van de VVD-testcase in Word hetzelfde financiële overzicht geeft als het origineel (op de bekende afwijkingen na).

**Fase 5: inzendingen en dashboard.** Supabase, toestemming, insturen, en een afgeschermd dashboard voor de fractie (inloggen met een magic link, alleen voor genodigden). Het dashboard toont: het aantal inzendingen, per post hoe vaak en hoeveel er gemiddeld is bezuinigd of geïnvesteerd, een heatmap op de kaart per wijk, de populairste combinaties, alle eigen ideeën met een zoekfunctie en moderatie, en een CSV-export.
*Klaar als:* een inzending in het dashboard verschijnt en de CSV klopt.

**Fase 6: campagnemodus en persoonlijke impact.** Vier rondes, gebeurteniskaarten, het persona-overzicht en het paneel "Wat betekent het voor mij?".

**Fase 7: persoonlijke video (plug-in).** Een los pakket (`packages/video`) met **Remotion**. Het maakt uit de keuzes van een speler een korte, verticale video (9:16, 20 tot 30 seconden): de gemeentekaart, de gebouwen die veranderen, de drie grootste keuzes, het saldo, en een vaste intro en outro, waarin Rik zelf iets kan zeggen (videofragment aanleveren). Renderen gebeurt op de server (Remotion Lambda of een eigen renderserver), op verzoek. De speler krijgt een downloadlink. Er worden geen persoonsgegevens gebruikt, behalve de optionele naam op het voorblad. Maak eerst een technisch ontwerp en een kostenraming voordat je dit bouwt.

**Fase 8: lancering.** Een eigen domein, privacy- en toegankelijkheidsverklaring, Open Graph-afbeeldingen, een test met vijf inwoners (let op waar ze vastlopen), en een laatste controle van alle bedragen.

---

## 14. Een nieuwe begroting inladen

Als de ontwerpbegroting 2027 verschijnt, moet die zonder codewijzigingen in de game kunnen. Bouw daarvoor:

1. **`npm run data:check [bestand]`:** valideert een begrotingsbestand met Zod en controleert:
   - dat de som van de onderdelen per deelprogramma niet hoger is dan de lasten van dat deelprogramma;
   - dat de totalen van de deelprogramma's overeenkomen met `totalen` (een tolerantie van € 1.000 voor afronding);
   - dat elk id in `dwarsverbanden.json`, `gebouwen.json`, `reacties.json` en `missies.json` bestaat, of in de mapping als vervallen staat;
   - dat elk onderdeel aan een gebouw hangt;
   - dat er geen kringen in de dwarsverbanden zijn, of dat ze gedocumenteerd zijn.
2. **`npm run data:diff 2026 2027`:** een leesbaar overzicht (Markdown) van nieuwe, vervallen en gewijzigde posten, met de grootste stijgers en dalers. Zo ziet de fractie meteen wat er in de nieuwe begroting veranderd is. Het overzicht is ook bruikbaar voor de eigen tegenbegroting.
3. **Mapping:** `data/mappings/id-mapping-2026-2027.json` koppelt oude ids aan nieuwe. Gedeelde links met een oud jaar worden omgezet, met een melding.
4. **In de game:** het jaartal komt overal uit de data ("Op de ontwerpbegroting 2027"). De meerjarenhorizon schuift mee (2027 t/m 2030).
5. **Documentatie:** volg `UPDATE-BEGROTING.md` voor de volledige werkwijze. De data wordt uit de PDF gehaald (door Claude in de chat of met een script) en daarna met deze tools gecontroleerd.

---

## 15. Open vragen: stel deze aan het begin

1. Moet de game zichtbaar een VVD-product zijn (huisstijl, logo), of juist neutraal met alleen een colofon? Is er een huisstijlhandboek met lettertypen?
2. Welk domein wordt het, en wie beheert de hosting en Supabase?
3. Moet de vergelijking met de VVD-tegenbegroting standaard aan staan?
4. Wie in de fractie krijgt toegang tot het dashboard?
5. Is er een budget voor de videoplug-in en de renderkosten?
6. Moeten de reacties van inwoners en de persona's worden afgestemd met de fractie voordat de game live gaat?
7. Is er toegang tot aanvullende gemeentelijke cijfers (aantal bijstandshuishoudens, OZB-tarieven, personeelskosten, boekwaarden van vastgoed) om aannames te vervangen door feiten? Zet de gevonden waarden in de data met status "feit" en een bron.
8. Welke deadline geldt voor de lancering, bijvoorbeeld het moment waarop de begroting 2027 in de raad komt?

---

## 16. Werkafspraken voor jou, Claude Code

- Lees eerst alle bestanden in `data/` en open het prototype. Vat in maximaal tien regels samen wat je hebt begrepen, en stel de open vragen.
- Maak voor elke fase eerst een kort plan (bestanden, stappen, risico's). Bouw daarna.
- Test de rekenmotor voordat je UI bouwt. Een bug in een bedrag is erger dan een lelijke knop.
- Verander nooit een bedrag in de data zonder bron. Een fout of inconsistentie in de data meld je in `data/BEVINDINGEN.md`.
- Maak screenshots met Playwright en bekijk ze voordat je zegt dat iets klaar is.
- Houd `README.md` bij: hoe je start, test, bouwt en een nieuwe begroting inlaadt.
- Schrijf commitboodschappen en documentatie in het Nederlands.
