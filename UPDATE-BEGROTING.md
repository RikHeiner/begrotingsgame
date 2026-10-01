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
5. **Belastingen:** de opbrengst per belasting uit de kerngegevens en de paragraaf lokale heffingen. Neem, als ze erin staan, ook de tarieven op (OZB-tarief woningen en niet-woningen, afvalstoffenheffing en rioolheffing per huishouden, parkeertarief per uur, prijs van een bewonersvergunning). Die zijn nodig voor "Wat betekent het voor mij?".
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
  "meerjarenHorizon": [JJJJ, JJJJ+1, JJJJ+2, JJJJ+3]
}
```

Staat er nog geen tegenbegroting van de fractie voor het nieuwe jaar, laat `vergelijking` dan leeg. Voer de Playwright-tests uit, bekijk de screenshots en zet de nieuwe versie online.

## Stap 4: de nieuwe tegenbegroting van de fractie

Zodra de fractie haar eigen tegenbegroting voor het nieuwe jaar heeft, maakt Claude er een `tegenbegroting-vvd-JJJJ.json` van, in dezelfde vorm als het bestand van 2026: per post omschrijving, bedrag, S/I en de koppeling aan een game-id. Posten zonder koppeling worden nieuwe actiekaarten. `npm run vvd-check` rekent de totalen na en toont afwijkingen.
