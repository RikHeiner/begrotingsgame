# Bevindingen in de data

Fouten, inconsistenties en open vragen die bij het bouwen zijn gevonden. Er is geen bedrag aangepast. Elk punt heeft een voorstel; de keuze is aan de fractie. Besluiten van Rik staan onderaan.

## A. Bedragen en totalen

1. **Deelprogramma 2.1 (Kwaliteit leefomgeving).** De onderdelen tellen op tot 139,800 mln. Het deelprogramma heeft 139,531 mln lasten in 2026 (0,269 mln minder). Volgens de werkwijze mag de som van de onderdelen niet hoger zijn. *Voorstel:* in het boekwerk nagaan welk getal klopt (waarschijnlijk bevat afval of riolering ook kapitaallasten die elders staan). Tot dan staat dit in `bekende_afwijkingen`, zodat `data:check` een waarschuwing geeft en geen fout.
2. **Afronding in de totalen.** De baten van de deelprogramma's wijken in 2026 € 2.000 en in 2028 € 3.000 af van de totale baten plus onttrekkingen aan reserves. Dat past bij afronding van 14 getallen. Geen actie nodig.
3. **Tekort in 2029.** De begroting zelf heeft in 2029 een tekort van 3,467 mln. De game rekent het saldo ten opzichte van de begroting, dus zonder keuzes is je begroting "sluitend". *Vraag:* moet de speler dit tekort ook dichten? Dat is één regel in de rekenmotor.
4. **Reserves aanvullen.** De kaart `k_res` is 7,0 mln. De VVD-tegenbegroting noemt 6,971 mln ("Verbeteren financiële positie"). *Voorstel:* 6,971 in de data zetten, met de tegenbegroting als bron.
5. **Burgerzaken (b1)** heeft geen gekoppelde baten, terwijl er wel leges zijn (paspoort, rijbewijs). Het dwarsverband zegt dat de leges gelijk blijven. Dat klopt zo, maar het bedrag van de leges zou in de uitleg kunnen.

## B. Formules in `dwarsverbanden.json`

6. **Tekenfout bij `kd_bedrijfsafval`.** De formule `delta_saldo = -pct/100 * (baten - lasten) - pct/100 * lasten * aandeel_vaste_kosten` geeft bij stoppen (pct = −100) een voordeel. Het is een nadeel: de winst van 1,5 mln valt weg en de vaste kosten lopen door. De motor rekent het directe effect bij de post en als kettingeffect `pct × lasten × aandeel_vaste_kosten` (−1,52 mln bij stoppen).
7. **Dubbeltelling in formules.** Bij `vh_parkeerhandhaving`, `kd_schouwburg`, `kd_leges_omgeving`, `rijk_geoormerkt` en `rijk_ozb_rekentarief` herhaalt de formule het directe effect dat al bij de post staat (via de gekoppelde baten). De motor rekent alleen het extra deel. Zie `SCHEMA.md`, punt 8.
8. **Ingroei en vertraging spreken elkaar soms tegen.** Voorbeelden: `jur_subsidies` heeft vertraging 1 en ingroei `[0.25, 1]` (dus al 25% in het eerste jaar); `org_ai` heeft vertraging 2 en ingroei `[0, 0.3, 0.7, 1]`; `zp_preventie_jeugd` heeft vertraging 2 en ingroei `[0, 0.5, 1]`. De motor telt een ingroeilijst vanaf het eerste jaar en gebruikt de vertraging alleen zonder lijst. *Vraag:* klopt dat met de bedoeling?
9. **"Te onderzoeken" met een waarde.** Vijf parameters hebben status "te onderzoeken", maar wel een waarde: `rijk_buig.gem_uitkering` (0,0165), `kd_afval.aandeel_toegerekende_overhead` (0,1), `kd_bedrijfsafval.aandeel_vaste_kosten` (0,2), `kd_werkplaats.aandeel_overheadvrijval` (0,1) en `zp_ongedocumenteerden.aandeel_restkosten` (0,2). Volgens de opdracht rekenen alleen parameters *zonder* waarde niet mee. Deze rekenen dus wel mee, met het label "nog te onderzoeken". Vooral `gem_uitkering` is belangrijk: daarop draait het effect van begeleiding naar werk. *Voorstel:* het aantal bijstandshuishoudens en de gemiddelde uitkering uit de begroting halen (status "feit").
10. **`wia_tegenprestatie`** heeft `s10` (armoederegelingen) in `van`. Dat lijkt een vergissing; de tegenprestatie hoort bij de bijstand (`s1`). Het verband wacht nu op de nieuwe post `nieuw:tegenprestatie`.
11. **`zp_beschermd_opvang` en `jur_contracten`.** De overlast door minder beschermd wonen telt vanaf het eerste jaar, terwijl de besparing door lopende contracten pas in het tweede jaar komt. Klein effect; kan later gelijk worden getrokken.
12. **`jur_gr` en `jur_contracten`** hebben geen formule. De motor leest de vertraging als: de besparing komt pas na 2 jaar (gemeenschappelijke regelingen) of na 1 jaar (contracten). Dat is een aanname en zo gelabeld. Bij jeugdzorg (z1 −10%) scheelt dat in 2026 11,7 mln.

## C. Ontbrekende gegevens (verbanden die nog niet worden doorgerekend)

13. Deze verbanden zijn ingebouwd, maar tonen "nog niet doorgerekend" omdat een getal ontbreekt:
    - aantal bijstandshuishoudens (`rijk_buig.aantal_bijstand`): ook nodig voor `wia_armoedeval`;
    - aantal deelnemers aan basisbanen, loonkostensubsidie en inburgering (`wia_basisbanen`, `wia_loonkosten`, `wia_inburgering`);
    - personeelskosten per deelprogramma (`org_frictie`): zonder dit getal komt een bezuiniging op ambtenaren meteen helemaal binnen;
    - bedragen uit het gemeentefonds per woonruimte, inwoner en bijstandshuishouden (`rijk_verdeelmodel`);
    - verdeling van de OZB over woningen en niet-woningen (`ec_ozb_nietwoningen`);
    - boekwaarde en huur van het vastgoed (`ec_strategisch_bezit`), het dividend van WarmteStad (`en_warmtestad`), de gemiste opbrengst van zon en wind (`en_opwek`);
    - beheer- en energiekosten van camera's en verlichting (`vh_camera_verlichting`);
    - wachtgeld wethouders (`org_wethouders`).
14. Zes verbanden wachten op een nieuwe post: entreeprijzen sport, tegenprestatie, heroïneverstrekking, prullenbakken, dividend, en (deels) 5% minder ambtenaren. Zie `vocabulaire.nieuw`.
15. Afval en riolering zijn vergrendeld. Daardoor doen `kd_afval` en `kd_riool` in de game nu niets. *Vraag:* wil de fractie een schuif voor de afvalstoffenheffing, waarbij alleen de heffing beweegt? De motor kan het al.

## D. Spelontwerp

16. **Woningbouw.** Met 20 woningen per mln levert het sneller-bouwenfonds (5 mln) 100 woningen per jaar op vanaf 2028, dus 200 in de meerjarenraming. De missie "1.000 extra woningen" is dan niet te halen. *Vraag:* is de parameter te laag, of moet de missie anders?
17. **Reserves aanvullen.** Omdat een overschot in de game ook naar de reserve gaat, verandert `k_res` het weerstandsvermogen niet: 7 mln eraf, 7 mln de reserve in. *Vraag:* moet een overschot vrije ruimte blijven (dan heeft `k_res` wel effect), of is dit goed zo?
18. **Persona's.** De gewichten in `spel/personas.json` zijn een eerste voorstel. Ze moeten met de fractie worden afgestemd.

## E. Kaart

19. **Wijken bij de gebouwen en persona's.** Volgens de CBS-codes ligt Vinkhuizen in Nieuw-West (WK001409), Selwerd in Noordwest (WK001410), Beijum in Noordoost (WK001411), en Lewenborg en Kardinge in Noorddijk (WK001412). De opdracht noemt "Werkplein in Noordwest (Vinkhuizen)", "Zwembad in Noordoost (Kardinge)" en "Buurthuis in Noorddijk (Beijum/Lewenborg)". In `gebouwen.json` staat nu de genoemde wijk (Noordwest, Noordoost, Noorddijk). De persona's staan in de wijk van hun buurt. Het prototype noemt Noorddijk "Beijum, Lewenborg"; dat klopt voor Beijum niet. *Vraag:* wijk of buurt aanhouden?

## E2. Kaart (fase 2)

23. **Water is een schets.** Vanuit de bouwomgeving is PDOK en OpenStreetMap niet bereikbaar. Eemskanaal, Van Starkenborghkanaal en Hoornseplas zijn daarom met de hand getekend (`schets: true` in `spel/kaart.json`). Paterswoldsemeer en Zuidlaardermeer gebruiken de vorm van de CBS-buurt met die naam. *Voorstel:* bij de lancering echte waterlijnen uit PDOK (TOP10NL) toevoegen.
24. **Gebouwen staan niet exact op hun buurt.** Om overlap te voorkomen schuift de game gebouwen in het drukke centrum een stukje uit elkaar. Het Stadhuis blijft op de Grote Markt.
25. **60 fps.** In de testomgeving rendert de browser zonder GPU (SwiftShader). Daar haalt de kaart ongeveer 50 tot 60 fps op telefoonformaat en 30 fps op 1440×900. De eis (60 fps op een middenklasse telefoon) moet op een echt toestel worden gemeten (fase 8).

26. **Missie "Bouwen, bouwen, bouwen"** (1.000 extra woningen) is met de huidige data niet te halen (zie punt 16). Volgens het besluit wordt dit met de begroting 2027 afgesteld.

## F. VVD-tegenbegroting (zie ook `npm run vvd:check`)

20. 13 posten hebben geen schuif of kaart in de game, onder andere 5% minder ambtenaren (16,4) en cultuur 20% (15,2). Die moeten een kaart of schuif worden.
21. Buiten de grenzen van de game: precario −111% (2,0 mln tegenover 1,8 mln opbrengst), armoederegelingen +34% (max +25%), en de autowerkplaats (geen netto lasten, dus niet als percentage te vertalen).
22. Overhead 5% is in de tegenbegroting 7,0 mln (bruto, heel deelprogramma 4.4). Op de schuif h1 is dat −5,7%. Dat past binnen de grenzen.

## G. Campagne en persoonlijke impact (fase 6)

27. **Gebeurteniskaarten zijn scenario's.** `spel/gebeurtenissen.json` heeft 15 kaarten. Elk bedrag is een percentage van een bedrag uit de begroting (bijvoorbeeld 4% van de lasten jeugdzorg, 1% van het gemeentefonds). Het bedrag uit de begroting is een feit; het percentage is een aanname, met een lage en een hoge waarde voor de scenario's. *Vraag:* wil de fractie de percentages controleren?
28. **Geen kaart voor een extra dividend.** De opdracht noemt een extra dividend, maar er staat geen post voor dividenden (BNG, Enexis) in de data. Zonder bedrag uit de begroting zou ik een getal moeten verzinnen. De kaart komt erbij zodra het dividend in de data staat (begroting 2027).
29. **Benaderingen in de kaarten.** De cao werkt op de overhead plus de posten "ambtenaren" (de loonsom staat niet in de data). Aardbevingsversterking werkt op de schoolgebouwen, energieprijzen op zwembaden en sporthallen, Nij Begun op de wijkvernieuwing. *Voorstel:* bij de begroting 2027 de loonsom en de energiekosten als kengetal toevoegen.
30. **Tarieven nog te controleren.** `tarieven-2026.json` (OZB 0,1473% van de WOZ-waarde, afvalstoffenheffing € 283,08 / € 331,20 / € 402,12, rioolheffing € 178,69, bewonersvergunningen per zone) komt uit zoekresultaten die verwijzen naar het raadsvoorstel *Belastingtarieven 2026*. Dat document en lokaleregelgeving.overheid.nl waren vanuit de bouwomgeving niet bereikbaar. *Vraag:* wil iemand de bedragen naast het raadsvoorstel leggen en daarna de status op "feit" zetten?
31. **Tweede parkeervergunning.** (Zie ook punt 43.) Alleen voor zone 2 is het tarief van een tweede vergunning bekend (€ 408,80). Voor de binnenstad en zone 3 tot en met 5 zegt het paneel "niet in de data" in plaats van een bedrag te verzinnen.
32. ~~**Parkeertarieven en vergunningen.**~~ *Opgelost (punt 39): elke vergunning heeft nu een eigen schuif per zone.* De schuif "Parkeertarieven" (t5) verandert in het paneel ook de prijs van de vergunning met hetzelfde percentage. Zo staat het in de uitleg van de schuif ("Parkeergeld en vergunningen"). *Vraag:* klopt dat met de bedoeling?
33. **Rioolheffing alleen voor eigenaren.** Volgens de bronnen betalen huurders alleen de afvalstoffenheffing. Het paneel volgt dat.

## H. Lancering (fase 8)

34. ~~**Parkeeropbrengst.**~~ *Opgelost (punt 39): het verschil zijn de parkeergarages, een eigen post.* De schuif "Parkeertarieven" (t5) rekent met € 35,1 mln opbrengst. De kerngegevens noemen € 26,3 mln parkeerbelasting (`kengetallen_2026.parkeerbelasting_x1000`). Misschien zitten in 35,1 ook de parkeergarages of vergunningen, maar dat staat niet in de data. Het verschil telt mee: "parkeren gratis" (−100%) kost in de game nu € 35,1 mln. *Vraag:* welk bedrag hoort bij de schuif, en met welke bron (pagina in het boekwerk)?
35. **Belastingen zonder bron.** De vijf belastingen in `begroting-2026.json` hebben geen veld `bron`. Vier bedragen kloppen met de kerngegevens (p. 4); voor de parkeertarieven zie punt 34. *Voorstel:* bij de begroting 2027 per belasting de pagina noteren.
36. **Groen als tekstkleur.** Groene tekst (#15875a uit het prototype) had te weinig contrast (4,2:1) op de achtergrond. De tekstkleur is nu #127a51 (5,0:1). De grafieken houden de gecontroleerde kleur.
37. **De kaart zonder PixiJS.** Om de laadtijd op telefoons (Lighthouse) te halen tekent de kaart nu met Canvas 2D. Hij ziet er hetzelfde uit en is ongeveer 400 kB kleiner. De inwoners lopen na een actie van de speler 30 seconden mee en staan daarna stil (batterij, opdracht 8.7). *Vraag:* is dat goed, of moeten ze altijd lopen?
38. **Nog in te vullen voor de lancering:** het e-mailadres van de fractie en de naam van de hosting (in `privacy.html` en `toegankelijkheid.html`), het domein (`VITE_SITE_URL`) en het Supabase-project. Zie `docs/LANCERING.md`.

## I. Parkeren per vergunning en zone (`parkeren-2026.json`)

39. **De parkeeropbrengst is verdeeld.** De € 35,1 mln van de schuif "Parkeertarieven" (t5) is nu verdeeld in posten, elk met een eigen schuif bij de Parkeergarage:
    - vergunningen: aantal × tarief, per tariefgebied voor bewoners (samen € 3,7 mln);
    - kortparkeren en overige parkeerbelasting: de parkeerbelasting uit de kerngegevens (€ 26,3 mln) min de vergunningen = € 22,6 mln (afgeleid);
    - parkeergarages: € 35,1 − € 26,3 = € 8,8 mln (volgens de fractie, 1 oktober 2026).
    De schuif t5 bestaat nog als gewogen gemiddelde. Kettingeffecten, inwoners en oude deellinks blijven zo werken; een oude keuze voor t5 geldt voor alle posten.
40. **Tariefgebieden zijn niet de parkeerzones.** Voor het uurtarief zijn er vijf parkeerzones; voor de bewonersvergunning drie tariefgebieden. De Hoogte, Korrewegwijk en Oosterparkwijk liggen in parkeerzone 2, maar betalen het tarief van zone 3 tot en met 5 (€ 62,05). De game rekent per tariefgebied. Kortparkeren heeft één schuif, omdat de opbrengst per zone niet bekend is. De uurtarieven per zone staan bij "Waarom ⚠︎?".
41. **Jaartallen.** De aantallen vergunningen komen uit het technische rapport (september 2025, peildatum 2025). De tarieven zijn van 2026 (raadsvoorstel Belastingtarieven 2026, status "te controleren"; daarom staat ⚠︎ bij die schuiven). Het uurtarief van zone 3 en 4 (€ 2,70) is van 2023: er staat geen indexatie naar 2026 in de data, dus `npm run data:check` waarschuwt. Voor de begroting 2027: nieuwe tarieven en aantallen invullen, of indexeren met het veld `indexatie` (zie `UPDATE-BEGROTING.md` stap 5). De indexatie van 4,09% voor 2026 komt uit de zoekresultaten en is nog te controleren.
42. **Bedrijfsvergunningen.** De gebieden in tabel 8 van het rapport tellen op tot 2.215, het totaal in de tabel is 2.216. De game rekent met de gebieden. Alle bedrijfsvergunningen tellen tegen het eerste tarief (€ 135,05); een extra vergunning kost € 609,55, maar het aantal is niet bekend (aanname, ⚠︎).
43. **Onbekende tarieven.** Het tarief van een tweede bewonersvergunning in de binnenstad en in zone 3 tot en met 5, en de bijgekochte uren van bezoekers, staan niet in de data. Die opbrengst zit nu in "kortparkeren en overig". *Vraag:* kan iemand deze tarieven opzoeken?
44. **Persona's en parkeren.** Peter en Tineke (Oosterpoort) reageren nu op de bewonersvergunningen in de tweede zone, niet meer op het gemiddelde. In hun beschrijving staat dat ze "maar één parkeervergunning krijgen", terwijl de data voor de tweede zone een tarief voor een tweede vergunning heeft (€ 408,80, 336 vergunningen). Misschien is er een wachtlijst. Fatima woont in Lewenborg; daar is geen betaald parkeren. Zij reageert nog op het gemiddelde. *Vraag:* klopt de beschrijving van beide persona's?
45. **Melding bij het parkeertarief.** De melding van het kettingeffect zei altijd "Goedkoper parkeren", ook bij een hoger tarief. De tekst is nu neutraal: "Ander parkeertarief: goedkoper geeft meer bezoekers in de binnenstad en meer autoverkeer, duurder het omgekeerde."

## J. Spelen zonder missies en meters

46. **Blije inwoners en meters uit beeld.** De score (0 tot 100) en de meters namen de huidige begroting als nulpunt (50). Dan lijkt het alsof inwoners nu tevreden zijn, terwijl veel mensen dat niet zijn. Ze staan niet meer in de HUD, de dialoog, het eindscherm of het document. De inwoners laten in woorden zien wat ze merken. De rekenmotor houdt de meters nog bij (kettingeffecten, debugpagina). *Mogelijkheden voor later:*
    - een beginstand uit een echte meting, bijvoorbeeld een enquête van de gemeente onder inwoners per thema (bron nodig);
    - per inwoner een wens (bijvoorbeeld "lagere OZB", "meer handhaving"): de score is hoe dicht je bij die wens komt, zodat de begroting van het college niet vanzelf "neutraal" is;
    - geen score, alleen wie wat merkt (zoals nu).
47. **Badge vervallen.** De badge "Veiligheidsheld" keek naar de meter Veilig; die is weggehaald. Het eindscherm heeft nu drie sterren in plaats van vijf (de sterren voor de missie en de meters vervallen).
48. **Bedrag invullen.** Naast elke schuif kan de speler het nieuwe bedrag typen (budget, opbrengst of tarief). De game rekent het percentage uit, tot op twee decimalen. Dezelfde grenzen gelden: een bedrag buiten de grens wordt geweigerd met een melding. Het budget is het bedrag van het eerste jaar.
49. **Woonlasten vergelijken met andere gemeenten.** Nog niet gebouwd: er is een bron nodig met de woonlasten per gemeente (bijvoorbeeld de *Atlas van de lokale lasten* van COELO, of de cijfers op waarstaatjegemeente.nl). Die sites waren vanuit de bouwomgeving niet bereikbaar. *Vraag:* sta `coelo.nl` en `waarstaatjegemeente.nl` toe, of stuur de pdf van de Atlas.

50. **Meer woningen, meer OZB.** Het kettingeffect "Sneller bouwen" rekende met € 300 OZB per nieuwe woning (aanname). Dat bedrag is nu berekend uit de data: OZB-tarief woningen × gemiddelde WOZ-waarde = 0,1473% × € 340.000 = € 501 per jaar. Kiest de speler een andere OZB, dan geldt die ook voor de nieuwe woningen. Het aantal extra woningen (20 per € 1 mln per jaar, vanaf 2 jaar na de start) blijft een aanname, dus het effect houdt ⚠︎. Nu levert alleen de kaart Sneller-bouwenfonds extra woningen op. *Vraag:* moeten ook de schuiven "Extra geld wonen" (w1) en "Meer betaalbare woningen" (w2) extra woningen opleveren, en hoeveel per miljoen (bron: het woningbouwprogramma)? En moet een nieuwe woning met de gemiddelde WOZ-waarde rekenen, of met die van nieuwbouw?

## Besluiten (1 oktober 2026)

| Punt | Besluit | Verwerkt |
|---|---|---|
| 3. Tekort 2029 | Niet dichten: het saldo telt ten opzichte van de begroting. | Zo gebleven. |
| 4. Reserves aanvullen | 6,971 mln, met de tegenbegroting als bron. | `k_res` aangepast. |
| 8. Ingroei | Een ingroeilijst telt vanaf het eerste jaar. | Zo gebleven. |
| 9. Te onderzoeken met waarde | Rekent mee, met label. | Zo gebleven. |
| 12. Contracten | Bezuinigen op zorg en onderhoud gaat pas na 1 jaar in. | Zo gebleven. |
| 13. Ontbrekende gegevens | Invullen bij de begroting 2027. | Open, zie `UPDATE-BEGROTING.md` stap 7. |
| 15. Afvalheffing | Geen schuif: het is een doelbelasting, het geld mag niet aan andere zaken worden uitgegeven. | Afval en riool blijven vergrendeld. |
| 16. Woningbouw en missies | De tegenbegroting 2026 is een voorbeeld, geen standaard. De werkbare versie draait op de begroting 2027. Missiedoelen komen in `spel/missies.json` en worden met de data van 2027 afgesteld. | Fase 3. |
| 17. Overschot | Een overschot is vrije ruimte. De speler kiest: uitgeven, of storten in de reserve (lager risico en minder rente). | Keuze `reserve` in de rekenmotor; overschot gaat niet meer vanzelf naar de reserve. |
| 18. Persona's | De fractie stemt ze af. | `docs/INWONERS-AFSTEMMEN.md`. |
| 19. Wijken | De gebiedsindeling van de gemeente aanhouden. | `spel/gebieden.json`: Centrum, Noord, Oost, Zuid, West, Haren, Ten Boer. Negen buurten bij het Eemskanaal en het Winschoterdiep staan niet in de lijst van de gemeente en zijn voorlopig bij Oost gezet (`controleren`). |
| 34. Parkeeropbrengst | Het verschil tussen € 35,1 en € 26,3 mln zijn de parkeergarages. Kortparkeren krijgt één schuif voor alle zones. | `parkeren-2026.json`, punt 39. |
| Missies | Vervallen: iedereen maakt een eigen begroting. De campagne blijft, met een eigen knop. | Punt 47. |
| Blije inwoners | Eerst weglaten; later misschien anders. | Punt 46. |
| Bedragen | Naast het percentage ook een bedrag kunnen invullen. | Punt 48. |
| Fase 7. Video | Geen persoonlijke video; de tegenbegroting blijft als Word, pdf en afbeelding. | `docs/VIDEO-ONTWERP.md` bewaard, niet gebouwd. |
