# Datamodel van de begrotingsgame

Alle bedragen, posten, teksten en parameters staan in deze map. De code kent geen begrotingsbedragen. De Zod-schema's staan in `src/engine/schema.ts`; `npm run data:check` controleert alles.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `config.json` | Actief begrotingsjaar, begrotingsbestand, tegenbegroting(en) voor de vergelijking, meerjarenhorizon, standaardscenario. |
| `begroting-JJJJ.json` | Totalen, kengetallen, deelprogramma's, onderdelen (schuiven), belastingen en actiekaarten. |
| `dwarsverbanden.json` | De kettingeffecten, met parameters en status (feit, aanname, te onderzoeken). |
| `tegenbegroting-*.json` | Een tegenbegroting als testcase en ter vergelijking. |
| `gemeente-groningen-wijken.geojson`, `-buurten.geojson` | Kaart (CBS 2024 via PDOK). |
| `spel/meters.json` | De acht meters, hun korte code en de spelregels voor de berekening. |
| `spel/gebieden.json` | De zeven gebieden van de gemeente (Centrum, Noord, Oost, Zuid, West, Haren, Ten Boer) met hun CBS-buurten. |
| `spel/gebouwen.json` | De 14 gebouwen, hun buurt, hun gebied en hun posten. |
| `spel/personas.json` | De inwoners, hun buurt, hun gebied en waar ze om geven. |
| `uitgaven-gemeenten-JJJJ.json` | Uitgaven per thema van de gemeenten met 100.000 inwoners of meer (CBS, Iv3), uit hun begroting of jaarrekening van dat jaar. Voor de vergelijking onderaan de gebouwen. Mag hooguit drie jaar ouder zijn dan de begroting; de game zegt er altijd bij uit welk jaar de cijfers zijn. Maken: `npm run uitgaven:ophalen`. |
| `mappings/id-mapping-OUD-NIEUW.json` | Koppeling van ids tussen begrotingsjaren (vanaf de begroting 2027). |

Alleen `.json` en `.geojson` worden online gezet. Deze documentatie niet.

## Uitbreidingen op de aangeleverde JSON

Alle uitbreidingen zijn optioneel. Zonder het veld werkt alles zoals eerst.

### `begroting-JJJJ.json`

| Veld | Waar | Betekenis |
|---|---|---|
| `ingroeipad` | onderdeel, actiekaart | Welk deel van het effect per jaar wordt gehaald, bijvoorbeeld `[0.25, 1]`. Standaard `[1]`. Na het laatste getal geldt het laatste getal. |
| `lasten_per_jaar_mln` | onderdeel | Lasten per jaar (`{"2027": 12.3}`) als die in de meerjarenraming veranderen. Standaard elk jaar `lasten_mln`. |
| `investering` | actiekaart | `{bedrag_mln, levensduur_jaar, eenmalige_bijdrage}`. Zonder eenmalige bijdrage rekent de game kapitaallasten: afschrijving plus rente (de rente komt uit `fin_kapitaallasten.rente`). |
| `gebouw` | actiekaart | Optioneel gebouw waar de kaart op de kaart bij hoort. |
| `tarieven` | belasting | Tarieven voor "Wat betekent het voor mij?" (fase 6). |
| `voorstel`, `controleren` | onderdeel | Markering bij een nieuwe begroting (zie `UPDATE-BEGROTING.md`). |
| `max_reden` | onderdeel | Waarom een post een maximum heeft (`max_pct`), bijvoorbeeld het maximum aantal wethouders. Zonder `max_pct` is er geen maximum. |
| `minimum` | onderdeel | Waarom een post niet lager kan dan `min_pct`: `{soort, reden, wet, bron, zekerheid, berekening}`. `soort` is `wet` (wettelijke plicht), `gr` (gemeenschappelijke regeling), `vast` (vaste lasten die blijven) of `nodig` (nodig voor andere taken of om de inkomsten te innen). `reden` ziet de speler (B1). `zekerheid` is `feit` als het percentage direct uit wet of document volgt, anders `aanname` (⚠︎). Verplicht als `min_pct` hoger is dan −100; `data:check` waarschuwt anders. Bij beginnen bij nul (de standaard) staat elke post op `min_pct`. |
| `bekende_afwijkingen` | hoofdniveau | Afwijkingen die bekend en uitgelegd zijn. `data:check` meldt ze dan als waarschuwing in plaats van fout. Toegevoegd: deelprogramma 2.1 (zie `BEVINDINGEN.md`). |

### `dwarsverbanden.json`

| Wijziging | Toelichting |
|---|---|
| `laag` en `hoog` bij een parameter | Bandbreedte voor de scenario's. Toegevoegd waar de toelichting een bandbreedte noemt: `kd_zwembad_tarief.elasticiteit` (−0,2 tot −0,6), `zp_preventie_jeugd.factor_escalatie` (0,1 tot 0,5), `or_achterstallig.factor_achterstallig` (1,2 tot 2,0), `ec_parkeren_elasticiteit.elasticiteit` (−0,1 tot −0,6), `org_frictie.verloop_pct` (4 tot 7%). Zonder `laag`/`hoog` is de bandbreedte 50% tot 150% van de waarde. Een feit heeft geen bandbreedte. |
| `org_capaciteit.factor_tempo` (0,5) | Stond alleen in de formule. Nu een parameter, zodat de code geen getal kent. |
| `kd_leges_omgeving.drempel_pct` (20) | Idem. |
| `fin_reserves.ondergrens_ratio` (1,0) | Uit het mechanisme: onder 100% is een waarschuwingssignaal. |

Er is geen bedrag aangepast.

### Nieuwe spelbestanden

- `spel/meters.json`: de korte codes (`v`, `s`, `z`, `w`, `c`) zijn de sleutels die de begroting al gebruikt bij `meters`. Daarbij komen `p` (portemonnee), `h` (wonen) en `d` (dienstverlening). De spelregels (gevoeligheid 120 en 150) komen uit het prototype.
- `spel/gebieden.json`: de game gebruikt de gebiedsindeling van de gemeente (wijkwethouders en gebiedsteams), niet de CBS-wijken. Elke CBS-buurt uit de kaart hoort bij precies één gebied; `data:check` controleert dat. Buurten in `controleren` staan niet in de lijst van de gemeente en zijn voorlopig bij Oost gezet.
- `spel/gebouwen.json`: de 14 gebouwen uit het prototype. `buurt` is een CBS-buurtcode, `gebied` moet daarbij passen. `onderdelen` moet precies overeenkomen met het veld `gebouw` bij de onderdelen; `data:check` controleert dat. De positie op de kaart volgt in fase 2.
- `spel/personas.json`: de acht inwoners uit de opdracht plus Peter en Tineke (Oosterpoort; het voorbeeld dat Rik in de raad gebruikte bij het parkeerbeleid, zie OOG april en juli 2024), met buurt en gebied. De gewichten zijn een voorstel; de fractie stemt ze af via `docs/INWONERS-AFSTEMMEN.md` (`npm run personas:overzicht`).

## Hoe de rekenmotor de data leest

Dit zijn de afspraken die niet direct uit de JSON volgen. Ze zijn bewust gekozen; vragen erover staan in `BEVINDINGEN.md`.

1. **Eenheden.** De motor rekent intern in euro's. `_mln` is miljoenen, `_x1000` is duizenden. Afronden gebeurt alleen bij de weergave.
2. **Saldo ten opzichte van de begroting.** Zonder keuzes is het saldo in elk jaar 0. Het eigen saldo van de begroting (in 2029 −3,467 mln) telt niet mee.
3. **Direct effect van een onderdeel:** `−pct × lasten + pct × gekoppelde baten`, per jaar maal het ingroeipad. In de uitleg zijn dat twee regels: minder uitgaven en de inkomsten die meebewegen. Vergrendelde posten en doorgeefluiken (afval, riool) hebben geen direct effect. Bij een doorgeefluik beweegt alleen de heffing (grootheid `heffing_afval`, `heffing_riool`).
4. **Belasting:** `pct × opbrengst`. **Actiekaart:** S elk jaar, I alleen in het eerste jaar.
5. **Ingroei en vertraging.** Een `ingroei`-lijst bij een dwarsverband telt vanaf het eerste jaar van de horizon. Zonder lijst begint een effect in jaar `vertraging_jaren` (0 = het eerste jaar).
6. **Zekerheid.** Een effect krijgt de zwakste status van de parameters die het gebruikt: feit, aanname of te onderzoeken. Een effect zonder parameters is een aanname. Een parameter zonder waarde (`null`) maakt het verband "nog niet doorgerekend", met de toelichting als reden. Een parameter met status "te onderzoeken" én een waarde rekent wel mee, met het label "nog te onderzoeken".
7. **Scenario's.** Bij voorzichtig en optimistisch rekent de motor elk verband met een bandbreedte twee keer door (alle parameters op laag, en op hoog). Voorzichtig neemt de uitkomst die het minst gunstig is voor het saldo over de hele horizon, optimistisch de meest gunstige.
8. **Geen dubbeltelling.** Waar een formule in de JSON het directe effect herhaalt (`rijk_geoormerkt`, `rijk_ozb_rekentarief`, `vh_parkeerhandhaving`, `kd_schouwburg`, `kd_leges_omgeving`), rekent het verband alleen het extra deel. Het directe deel staat al bij de post.
9. **Volgorde.** Een graaf van `naar` naar `van`, aangevuld met de grootheden die een implementatie leest en schrijft. Een kring wordt één keer doorgerekend en gemeld in `data:check`.
10. **Weerstandsvermogen en reserve.** Benodigde capaciteit = algemene reserve / ratio (81,1 / 1,61). Een overschot is vrije ruimte: het gaat niet vanzelf naar de reserve. De speler kiest zelf of hij het uitgeeft of stort (keuze `reserve`, elk jaar of eenmalig, of de kaarten in `fin_reserves.van`). Een storting is een uitgave in het saldo, verhoogt de reserve en scheelt vanaf het jaar erna rente (`fin_kapitaallasten.rente` over het gestorte bedrag, aanname). Een tekort gaat van de reserve af. Een ratio onder `ondergrens_ratio` is een overtreding.
11. **Slot op de pot.** Een wijziging mag als het structurele saldo daarna in elk jaar ≥ 0 is of niet slechter wordt; hetzelfde voor structureel + eenmalig samen.
12. **Meters.** Per meter 50 + gevoeligheid × (gewogen gemiddelde wijziging van de niet-vergrendelde posten met een gewicht). Portemonnee: 50 − gevoeligheid × (gewogen gemiddelde wijziging van de belastingen, gewogen naar opbrengst × voelbaarheid). Daarbij de punten van kaarten en kettingeffecten (`punten_dwarsverband_per_100pct` per 100% wijziging). Altijd tussen 0 en 100.
13. **Persona's.** 50 + gewogen gemiddelde afwijking van hun meters + `punten_posten_per_100pct` × gewicht × wijziging van hun posten. Een actieve kaart telt als 100%.
14. **Beginnen bij nul (de standaard).** Elke post staat op `min_pct`; vergrendelde posten blijven. Een post blijft op het niveau van het college als schrappen geld kost: alleen die post naar zijn minimum maakt het structurele saldo over alle jaren samen niet beter (bijvoorbeeld bedrijfsafval en parkeercontrole). De belastingen, parkeertarieven en kaarten beginnen zoals in de begroting. De percentages blijven ten opzichte van de begroting van het college, zodat een deellink, de tegenbegroting en de vergelijking op het eindscherm altijd hetzelfde betekenen. Code: `src/game/nulbasis.ts`.

## Een id-mapping (`mappings/id-mapping-OUD-NIEUW.json`)

```json
{
  "van_jaar": 2026,
  "naar_jaar": 2027,
  "posten": [
    { "oud": "e3", "nieuw": "e3", "oude_naam": "Citymarketing", "nieuwe_naam": "Citymarketing en promotie" },
    { "oud": "e8", "nieuw": null, "vervallen": true, "toelichting": "Project afgerond" },
    { "oud": "m3", "nieuw": null, "splitst_in": ["m12", "m13"] }
  ]
}
```
