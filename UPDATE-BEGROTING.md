# Een nieuwe begroting inladen

Deze werkwijze gebruik je als de ontwerpbegroting 2027 (of een later jaar) verschijnt. Het doel: een nieuw `data/begroting-JJJJ.json` dat de game zonder codewijzigingen kan inladen, met stabiele ids en gecontroleerde bedragen.

## Stap 1: de data uit de PDF halen (Claude in de chat)

Upload het boekwerk van de nieuwe ontwerpbegroting in een chat met Claude, samen met `data/begroting-2026.json` (of het meest recente jaar), `data/dwarsverbanden.json` en dit bestand. Plak dan deze prompt:

> Hier is de ontwerpbegroting JJJJ van de gemeente Groningen, het vorige begrotingsbestand van de begrotingsgame, de dwarsverbanden en de werkwijze voor een update. Maak volgens `UPDATE-BEGROTING.md` een nieuw `begroting-JJJJ.json`, een `id-mapping-VORIG-JJJJ.json` en een `WIJZIGINGEN-JJJJ.md`. Volg de regels hieronder precies en meld alles wat je niet zeker weet.

Claude doet dan het volgende:

1. **Totalen en kengetallen:** uit de kerngegevens voorin het boekwerk (lasten, belastingopbrengsten, OZB, gemeentefonds, algemene reserve, weerstandsvermogen, aantal woningen, gemiddelde WOZ) en uit het overzicht "Begroting op deelprogramma" achterin (lasten en baten per deelprogramma voor de hele meerjarenraming, en het saldo van baten en lasten).
2. **Onderdelen:** per deelprogramma uit de financiële toelichting "Waar gaat het geld voornamelijk naar toe (bestaand beleid)". Neem per post de lasten en baten over (in duizenden euro's in de PDF, in miljoenen in de JSON).
3. **Ids en mapping:**
   - Een post die ook in het vorige jaar stond, houdt zijn id, ook als de naam iets verandert. Leg de oude en nieuwe naam vast in de mapping.
   - Een nieuwe post krijgt een nieuw id met dezelfde letter als de andere posten van dat thema (`e`, `m`, `w`, `o`, `v`, `s`, `d`, `z`, `k`, `c`, `b`, `g`, `h`) en het volgende vrije nummer.
   - Een post die verdwenen is, blijft in de mapping staan met `"vervallen": true`.
   - Een post die is opgesplitst of samengevoegd, wordt in de mapping als zodanig beschreven (`"splitst_in"` of `"samengevoegd_uit"`).
4. **Spelontwerp overnemen:** voor posten met hetzelfde id neemt Claude de velden `gebouw`, `min_pct`, `max_pct`, `vergrendeld`, `reden_vergrendeld`, `doorgeefluik_heffing`, `wettelijke_taak`, `meters`, `tekst_bezuinigen` en `tekst_investeren` over. Voor nieuwe posten doet Claude een voorstel, gemarkeerd met `"voorstel": true`, zodat de fractie het kan controleren.
5. **Belastingen:** de opbrengst per belasting uit de kerngegevens en de paragraaf lokale heffingen. Neem, als ze erin staan, ook de tarieven op (OZB-tarief woningen en niet-woningen, afvalstoffenheffing en rioolheffing per huishouden, parkeertarief per uur, prijs van een bewonersvergunning). Die zijn nodig voor "Wat betekent het voor mij?". Ze komen in een eigen bestand `data/tarieven-JJJJ.json`, met dezelfde opbouw als `tarieven-2026.json`, en in `config.json` onder `tarieven`.
6. **Actiekaarten:** de eenmalige acties en beleidskeuzes van het vorige jaar blijven staan, tenzij ze niet meer kunnen (een project is al gestopt of een pand is al verkocht). Dat staat dan in `WIJZIGINGEN-JJJJ.md`. Actiekaarten uit een nieuwe tegenbegroting van de fractie komen erbij zodra die beschikbaar is.
7. **Dwarsverbanden:** Claude controleert of alle ids in `van` en `naar` nog bestaan. Waar de nieuwe begroting een getal geeft voor een parameter met status "te onderzoeken" of "aanname" (bijvoorbeeld het aantal bijstandshuishoudens of de omvang van de personeelskosten), vult Claude dat in met status "feit" en een bron met paginanummer.
8. **Bron per getal:** bij elk deelprogramma en onderdeel de pagina in het boekwerk.

## Regels voor Claude bij het uitlezen

- Neem getallen letterlijk over uit de PDF. Reken niets bij, behalve de omzetting van duizenden naar miljoenen.
- De som van de onderdelen per deelprogramma mag niet hoger zijn dan de lasten van dat deelprogramma. Het verschil is "overige posten".
- Controleer dat de som van de deelprogramma's gelijk is aan de totale lasten en baten (exclusief reservemutaties).
- Is een tabel onleesbaar of dubbelzinnig in de tekstlaag, bekijk dan de pagina als afbeelding.
- Twijfel over een getal of een koppeling: zet `"controleren": true` bij de post en leg het uit in `WIJZIGINGEN-JJJJ.md`. Nooit gokken.

## Stap 2: controleren (Claude Code)

Zet de nieuwe bestanden in `data/` en `data/mappings/`, en voer uit:

```
npm run data:check data/begroting-JJJJ.json
npm run data:diff VORIG JJJJ
npm test
```

Los alle fouten op. Bekijk het verschillenoverzicht met de fractie: dat is ook meteen een goede basis voor de nieuwe tegenbegroting.

## Stap 3: activeren

Pas `data/config.json` aan:

```json
{
  "actiefJaar": JJJJ,
  "begroting": "begroting-JJJJ.json",
  "vergelijking": ["tegenbegroting-vvd-JJJJ.json"],
  "tarieven": "tarieven-JJJJ.json",
  "parkeren": "parkeren-JJJJ.json",
  "woonlasten": "woonlasten-JJJJ.json",
  "meerjarenHorizon": [JJJJ, JJJJ+1, JJJJ+2, JJJJ+3]
}
```

Staat er nog geen tegenbegroting van de fractie voor het nieuwe jaar, laat `vergelijking` dan leeg. Voer de Playwright-tests uit, bekijk de screenshots en zet de nieuwe versie online.

## Stap 4: de nieuwe tegenbegroting van de fractie

Zodra de fractie haar eigen tegenbegroting voor het nieuwe jaar heeft, maakt Claude er een `tegenbegroting-vvd-JJJJ.json` van, in dezelfde vorm als het bestand van 2026: per post omschrijving, bedrag, S/I en de koppeling aan een game-id. Posten zonder koppeling worden nieuwe actiekaarten. `npm run vvd-check` rekent de totalen na en toont afwijkingen.

## Stap 5: tarieven en parkeren

Twee bestanden hebben bedragen met een eigen jaartal. Let bij elk bedrag op dat jaartal: een rapport uit 2025 geeft bedragen van 2025, niet van het begrotingsjaar.

**`tarieven-JJJJ.json`** (paneel "Wat betekent het voor mij?"): OZB, afvalstoffenheffing en rioolheffing uit het raadsvoorstel *Belastingtarieven JJJJ*.

**`parkeren-JJJJ.json`** (de parkeerschuiven bij de Parkeergarage). Kopieer het bestand van vorig jaar en loop het na:

1. `begrotingsjaar` en de `bronnen` (titel, url, datum, status). Zet de status pas op `feit` als iemand het bedrag in het document heeft gezien.
2. **Tarieven** per vergunning en tariefgebied (`vergunningen[].tarief`) en het uurtarief per zone (`parkeerzones[].uurtarief`). Elk tarief heeft een `prijspeil`: het jaar waarvoor het tarief geldt.
   - Is het nieuwe tarief bekend? Vul het in met `prijspeil` JJJJ.
   - Nog niet bekend? Laat het oude tarief staan en voeg in `indexatie` een regel toe, bijvoorbeeld `{ "naar_jaar": JJJJ, "pct": 3.5, "bron": "…", "toelichting": "…" }`. De game rekent het tarief dan om naar JJJJ en zegt dat bij "Waarom ⚠︎?".
3. **Aantallen** vergunningen per gebied (`aantallen.gebieden`) met het `peiljaar`. Vergelijk `totaal_volgens_bron` met de tabel in de bron.
4. Het kengetal `parkeerbelasting_x1000` in de kerngegevens en de schuif `t5` in de begroting. Kortparkeren is de parkeerbelasting min de vergunningen; de garages zijn `t5` min de parkeerbelasting.
5. Voer uit:

```
npm run data:check -- --alles
npm run bedragen:controle
```

`data:check` waarschuwt bij een tarief van een ouder jaar zonder indexatie, bij aantallen ouder dan vorig jaar, en als de gebieden niet optellen tot het totaal in de bron. `bedragen:controle` zet alle parkeerposten met tarief, jaar en aantal in `docs/CONTROLE-BEDRAGEN.md`, om naast de bron te leggen.

## Stap 6: woonlasten vergelijken met andere gemeenten

**`woonlasten-JJJJ.json`** (de vergelijking onderaan "Wat betekent het voor mij?"). COELO publiceert elk voorjaar de *Atlas van de lokale lasten*. Staat het databestand van het nieuwe jaar online, voer dan uit:

```
npm run woonlasten:ophalen -- JJJJ
```

Het script haalt het databestand *Gemeentelijke belastingen JJJJ* van COELO op (OZB, afval, riool en woonlasten per gemeente) en het aantal inwoners per gemeente bij CBS (tabel 70072ned). Het stopt als de kolommen in het bestand van COELO anders staan dan verwacht, en waarschuwt als de woonlasten niet de som van de heffingen zijn.

Een paar cijfers staan niet in het databestand. Neem die met de hand over in `handmatig`, en werk de bronnen bij (url en datum):

1. De landelijke gemiddelden (koop en huur, een- en meerpersoons): pagina *Gemiddelde gemeentelijke woonlasten JJJJ* van COELO.
2. De woonlasten van huurders in Groningen en de rangnummers: de tabel *Woonlasten en rangnummers per gemeente*, provincie Groningen (een plaatje).

Draai daarna de tests. Een test controleert dat het rangnummer dat de game uitrekent hetzelfde is als dat van COELO, en dat de tarieven van Groningen bij COELO gelijk zijn aan die in `tarieven-JJJJ.json`.

Werk je in de cloudomgeving van Claude Code? Zet dan `NODE_USE_ENV_PROXY=1` voor het commando, anders komt Node niet langs de proxy.
