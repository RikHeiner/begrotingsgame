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

23. ~~**Water is een schets.**~~ *Opgelost (1 oktober 2026):* het Eemskanaal, het Van Starkenborghkanaal en de Hoornse Plas komen nu uit PDOK (BRT TOP10NL, `waterdeel_vlak`). Van de kanalen staat de middenlijn binnen de gemeente in `spel/kaart.json`, van de Hoornse Plas de vereenvoudigde omtrek. De schets lag op sommige plekken ruim 3 km naast het echte kanaal. Paterswoldsemeer en Zuidlaardermeer gebruiken nog de vorm van de CBS-buurt.
24. **Gebouwen staan niet exact op hun buurt.** Om overlap te voorkomen schuift de game gebouwen in het drukke centrum een stukje uit elkaar. Het Stadhuis blijft op de Grote Markt.
25. **60 fps.** In de testomgeving rendert de browser zonder GPU (SwiftShader). Daar haalt de kaart ongeveer 50 tot 60 fps op telefoonformaat en 30 fps op 1440×900. De eis (60 fps op een middenklasse telefoon) moet op een echt toestel worden gemeten (fase 8).

26. **Missie "Bouwen, bouwen, bouwen"** (1.000 extra woningen) is met de huidige data niet te halen (zie punt 16). Volgens het besluit wordt dit met de begroting 2027 afgesteld.

## F. VVD-tegenbegroting (zie ook `npm run vvd:check`)

20. 13 posten hebben geen schuif of kaart in de game, onder andere 5% minder ambtenaren (16,4) en cultuur 20% (15,2). Die moeten een kaart of schuif worden.
21. Buiten de grenzen van de game: precario −111% (2,0 mln tegenover 1,8 mln opbrengst), armoederegelingen +34% (max +25%), en de autowerkplaats (geen netto lasten, dus niet als percentage te vertalen).
22. Overhead 5% is in de tegenbegroting 7,0 mln (bruto, heel deelprogramma 4.4). Op de schuif h1 is dat −5,7%. Dat past binnen de grenzen.

## G. Campagne en persoonlijke impact (fase 6)

27. ~~**Gebeurteniskaarten zijn scenario's.**~~ *Vervallen (punt 51): de gebeurteniskaarten zijn weg.* `spel/gebeurtenissen.json` heeft 15 kaarten. Elk bedrag is een percentage van een bedrag uit de begroting (bijvoorbeeld 4% van de lasten jeugdzorg, 1% van het gemeentefonds). Het bedrag uit de begroting is een feit; het percentage is een aanname, met een lage en een hoge waarde voor de scenario's. *Vraag:* wil de fractie de percentages controleren?
28. ~~**Geen kaart voor een extra dividend.**~~ *Vervallen (punt 51): de gebeurteniskaarten zijn weg.* De opdracht noemt een extra dividend, maar er staat geen post voor dividenden (BNG, Enexis) in de data. Zonder bedrag uit de begroting zou ik een getal moeten verzinnen. De kaart komt erbij zodra het dividend in de data staat (begroting 2027).
29. ~~**Benaderingen in de kaarten.**~~ *Vervallen (punt 51): de gebeurteniskaarten zijn weg.* De cao werkt op de overhead plus de posten "ambtenaren" (de loonsom staat niet in de data). Aardbevingsversterking werkt op de schoolgebouwen, energieprijzen op zwembaden en sporthallen, Nij Begun op de wijkvernieuwing. *Voorstel:* bij de begroting 2027 de loonsom en de energiekosten als kengetal toevoegen.
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
49. **Woonlasten vergelijken met andere gemeenten.** Gebouwd. Onderaan "Wat betekent het voor mij?" staat nu hoeveel een standaardhuishouden in Groningen aan woonlasten betaalt (OZB + afval + riool), naast het landelijk gemiddelde, het rangnummer en een lijst met de 12 grootste gemeenten of de gemeenten in de provincie Groningen. Bij een koophuis telt de OZB-keuze van de speler mee ("met jouw OZB-keuze: € 1.199, plaats 262"). Bron: COELO, *Atlas van de lokale lasten 2026* (databestand en site) en CBS (inwoners). De cijfers staan in `woonlasten-2026.json` en komen uit `npm run woonlasten:ophalen` (zie `UPDATE-BEGROTING.md` stap 6).
    - 2026, meerpersoonshuishouden met een koophuis: Groningen € 1.268, gemiddeld € 1.095, plaats 293 van 342 (1 = goedkoopst). Eenpersoons: € 1.149, gemiddeld € 1.000.
    - Huurders: Groningen € 283 (eenpersoons) en € 402 (meerpersoons), gemiddeld € 391 en € 500, plaats 79. Voor huurders staat geen lijst per gemeente in het databestand; die cijfers zijn met de hand overgenomen.
    - COELO rekent met de gemiddelde WOZ-waarde van een **koopwoning** (Groningen: OZB € 687), de game in de tabel erboven met de gemiddelde WOZ-waarde van alle woningen (€ 340.000, OZB € 501). Daarom verschillen de bedragen. De vergelijking zegt dat erbij.
    - De tarieven van Groningen bij COELO (OZB 0,1473%, afval € 283,08 en € 402,12, riool € 178,69) zijn dezelfde als in `tarieven-2026.json`, dat nog op "te controleren" staat. *Voorstel:* de status op "feit" zetten, met COELO als tweede bron.
    - waarstaatjegemeente.nl was nog steeds niet bereikbaar; dat was ook niet nodig.

50. **Meer woningen, meer OZB.** Het kettingeffect "Sneller bouwen" rekende met € 300 OZB per nieuwe woning (aanname). Dat bedrag is nu berekend uit de data: OZB-tarief woningen × gemiddelde WOZ-waarde = 0,1473% × € 340.000 = € 501 per jaar. Kiest de speler een andere OZB, dan geldt die ook voor de nieuwe woningen. Het aantal extra woningen (20 per € 1 mln per jaar, vanaf 2 jaar na de start) blijft een aanname, dus het effect houdt ⚠︎. Nu levert alleen de kaart Sneller-bouwenfonds extra woningen op. *Vraag:* moeten ook de schuiven "Extra geld wonen" (w1) en "Meer betaalbare woningen" (w2) extra woningen opleveren, en hoeveel per miljoen (bron: het woningbouwprogramma)? En moet een nieuwe woning met de gemiddelde WOZ-waarde rekenen, of met die van nieuwbouw?
    - **Gemeentefonds (`rijk_verdeelmodel`), nu doorgerekend.** De bedragen per eenheid komen uit de *Meicirculaire gemeentefonds 2026*, bijlage 2.1.1 (p. 54), stand mei 2026: woonruimten € 11,55, inwoners € 374,88, bijstandsontvangers € 5.136,70. Die bedragen staan "in basis" en gaan keer de uitkeringsfactor 1,491 (tabel 2.5.2-1, p. 25). Per woonruimte zit de verrekening van de OZB al in het bedrag (−€ 62,09), daarom is het klein. Met 1,93 inwoners per woning (244.427 inwoners volgens CBS / 126.796 woningen, aanname) levert een nieuwe woning ongeveer **€ 1.096 per jaar** gemeentefonds op, een jaar later (het Rijk telt de stand van het jaar ervoor). Een bijstandshuishouden minder kost ongeveer **€ 7.659** gemeentefonds. Dat is het kleine tegeneffect bij begeleiding naar werk; de besparing op de uitkering (€ 16.500) is veel groter.
    - Bij het Sneller-bouwenfonds: 100 woningen in 2028 leveren in 2029 € 0,11 mln op.
    - Niet meegenomen: de maatstaf "woonruimten bodemfactor woonkern" (€ 52,99, alleen voor woningen op slappe bodem), "huishoudens met een laag inkomen" (met drempel) en latere uitkeringsfactoren (2027: 1,549). Alles rekent met 2026.
    - De pdf op gemeenteraad.groningen.nl zit achter een botcontrole en was niet te downloaden. Gebruikt is dezelfde meicirculaire van rijksoverheid.nl (`meicirculaire-gemeentefonds-2026.pdf`, 29 mei 2026).
    - *Vraag:* wonen in een nieuwe woning evenveel mensen als gemiddeld (1,93)? Bij studentenwoningen minder, bij gezinswoningen meer. Het woningbouwprogramma kan dat preciezer maken.

51. **Campagnemodus en gebeurteniskaarten eruit.** De knop "Speel vier jaar (campagne)" is weg, met de rondes, de gebeurtenisdialoog en het campagne-overzicht op het eindscherm, en de berekening over meerdere rondes (`berekenCampagne`). Op jouw verzoek zijn daarna ook de gebeurteniskaarten weggehaald: `spel/gebeurtenissen.json`, hun berekening in de rekenmotor, het blok "Gebeurtenissen" in het document en de twee kettingeffecten die ze gebruikten (`rijk_accres`, korting op het gemeentefonds, en `fin_onvoorzien`). Er zijn nu 65 kettingeffecten.

52. **Bouwleges vast.** De omgevingsvergunningen (`w8`) zitten nu vast, net als afval en riolering: de bouwleges moeten 100% kostendekkend zijn. De speler ziet een slotje met die uitleg. Gevolgen:
    - het kettingeffect `kd_leges_omgeving` rekent niet meer met de leges, alleen nog met het bouwtempo bij minder ambtenaren voor wonen (`w4`) en gebiedsontwikkeling (`e10`);
    - "Sneller bouwen" (`wg_woningbouw`) noemt geen extra leges meer: meer vergunningen kosten evenveel als ze opbrengen;
    - de reactie "Ik wacht lang op mijn vergunning" is weg, omdat die alleen bij bezuinigen op `w8` kwam.
    - *Open:* in de begroting staan bij `w8` 10,5 mln lasten en 17,9 mln leges. Als de leges kostendekkend zijn, dekken ze ook overhead en andere kosten die elders in de begroting staan. Het antwoord staat in het boekwerk, paragraaf lokale heffingen (tabel kostendekkendheid van de leges). Het boekwerk was vanuit de bouwomgeving niet op te halen: de raadssite weigert verzoeken uit een datacenter. Voor de game maakt het niet uit, omdat de post vastzit.

53. **Extra woningen door meer RO-ambtenaren.** Meer geld voor "Ambtenaren wonen" (`w4`) en "Ambtenaren gebiedsontwikkeling" (`e10`) levert in "Sneller bouwen" nu ook extra woningen op. Hoeveel per miljoen staat nog niet in de data (`extra_woningen_per_mln_ro` = leeg). Tot dan zegt de game "nog niet doorgerekend", of bij het fonds: "deels doorgerekend". Bezuinigen op deze ambtenaren remt het bouwen, zoals al in `kd_leges_omgeving`. Beleidskeuzes die woningen opleveren volgen later.
    - *Vraag:* hoeveel extra woningen per jaar levert € 1 mln per jaar extra voor RO-ambtenaren op? En welke beleidskeuzes moeten er nog bij?
54. **WOZ-waarde van nieuwbouw.** Een nieuwe woning betaalt nu OZB over de WOZ-waarde van nieuwbouw: de gemiddelde WOZ-waarde (€ 340.000, kerngegevens) × 1,32 = ongeveer € 447.000, dus € 661 OZB per jaar (was € 501). De factor 1,32 komt uit CBS Kerncijfers wijken en buurten 2025 (86165NED): in 115 buurten van Groningen hangt de gemiddelde WOZ-waarde samen met het aandeel woningen uit de afgelopen tien jaar; een buurt met alleen nieuwbouw komt uit op € 412.000 tegen € 313.000 gemiddeld. Buurten met minstens de helft nieuwbouw (onder andere Reitdiep, Meeroevers, Tersluis, De Zeilen) geven € 407.000. CBS heeft geen tabel met de WOZ-waarde naar bouwjaar, dus de factor is een aanname met ⚠︎.

55. **Hondenbelasting weer invoeren.** Nieuwe actiekaart `k_hond` in het Veilinghuis: € 1,015 mln per jaar vanaf 2027 (eerst een nieuwe verordening), en in "Wat betekent het voor mij?" het vinkje "Ik heb een hond" (€ 133 per jaar met de kaart). Groningen schafte de hondenbelasting af per 1 januari 2022 en verhoogde daarvoor de OZB (€ 3,50 bij een WOZ-waarde van € 200.000). Bronnen: [RTV Noord, 6 juli 2021](https://www.rtvnoord.nl/nieuws/832820/groningen-schaft-hondenbelasting-af-ozb-gaat-omhoog) (€ 133 per hond), [OOG](https://www.oogtv.nl/2021/07/hondenbelasting-in-gemeente-groningen-wordt-afgeschaft/) (ongeveer € 1 mln) en de raadsbrief "Reactie op drie moties m.b.t. hondenbelasting" (€ 1,015 mln voor 2021; dat document was niet te openen, het bedrag komt uit een zoekresultaat). Ter vergelijking (COELO 2026): 100 van de 342 gemeenten heffen hondenbelasting, mediaan € 77,52; bij de grote steden die het heffen is de mediaan € 103,85.
    - Het bedrag is van 2021 en niet geïndexeerd, en het aantal honden kan veranderd zijn: daarom ⚠︎ aanname.
    - Niet meegerekend: de kosten van heffen en controleren, en kwijtschelding.
    - *Vraag:* met welk tarief wil de fractie rekenen: het oude Groningse tarief (€ 133), de mediaan van de grote steden (€ 103,85) of een ander bedrag?

56. **Geen plafond meer op meer uitgeven.** Posten konden niet meer dan +25% omhoog. Dat was een spelregel zonder reden. Nu hebben 79 posten geen maximum (`max_pct: null`): de schuif loopt tot +100% en daarboven kun je zelf een bedrag typen. Je hebt wel dekking nodig (het slot op de pot). Alleen waar een echte grens is, staat een maximum met de reden erbij (`max_reden`):
    - College van B en W (`g1`): maximaal +12,5%. De Gemeentewet (art. 36) staat maximaal 20% van het aantal raadsleden als wethouder toe; bij 45 raadsleden zijn dat er 9, en Groningen heeft er nu 8 ([gemeente Groningen](https://gemeente.groningen.nl/samenstelling-college-van-bw-taken-en-contact)).
    - De ondergrenzen (wettelijke taken, bijvoorbeeld jeugdzorg −10%) en de vaste posten zijn niet veranderd.
    - Besluit: ook de belastingen en parkeertarieven hebben geen maximum meer (er is bijvoorbeeld geen wettelijk maximum voor de OZB). Bij parkeren rekent het kettingeffect met minder bezoekers bij een hoger tarief; de parkeeropbrengst kan daardoor nooit onder nul zakken (bij +500% is ze precies nul).

57. **Beginnen bij nul.** Op het startscherm (en in Instellingen) kun je kiezen: beginnen met de begroting van het college, of bij nul. Bij nul staat elke post op het laagste niveau dat de game toestaat: de 10 wettelijke taken op hun minimum (bijvoorbeeld jeugdzorg −10%), de 9 vaste posten (bijstand, Veiligheidsregio, rente, afval, riool, bouwleges) blijven, 50 posten gaan naar nul en 20 posten naar hun ondergrens (bijvoorbeeld schuldhulp en onderhoud van wegen −50%, de gemeenteraad −25%). De belastingen blijven zoals in de begroting. Van de € 1.329 mln aan posten blijft zo € 910 mln over; na de kettingeffecten (afbouw van subsidies, frictiekosten) heb je € 213 mln (2026) tot € 299 mln (2027) per jaar te verdelen.
    - Op het eindscherm staat nu altijd de tabel "Jouw begroting naast die van het college": de uitgaven per thema en de inkomsten uit belastingen, in het eerste jaar en zonder kettingeffecten.
    - De vraag over de spelgrenzen is beantwoord in punt 58.
58. **Bij nul is de standaard, met het echte minimum per post.** De game begint nu bij nul en onthoudt het beginpunt (ook in een deellink). Elke ondergrens is opnieuw onderzocht: per post de wet en het artikel (wetten.overheid.nl), gecontroleerd door een juridische en een spelmatige tegenlezer. Bij verschil telt de hoogste ondergrens, want "lager kan niet" moet kloppen. De reden staat per post in het nieuwe veld `minimum` (soort, reden, wet, bron, zekerheid, berekening; zie `SCHEMA.md`) en de speler ziet hem in het paneel.
    - **Uitkeringen op het wettelijke minimum.** De bijstand (`s1`) blijft vast: de norm staat in de wet. Loonkostensubsidie (`s4`) zit nu ook vast: een wettelijk recht (Participatiewet art. 10d). Bijzondere bijstand −25% (was −50%: het is een individueel recht), individuele inkomenstoeslag −75%, schuldhulp −60%, begeleiding naar werk −70% (was −100%).
    - **Nieuwe ondergrens waar de wet iets vraagt** (was −100%): voorschoolse educatie in onderwijskansen −40%, leerplicht en RMC −40%, toezicht op bouwen −60%, openbare orde −75%, meldpunt goed verhuurderschap −80%, BGT bijhouden (geo en data) −50%, meldpunt discriminatie −85%, warmteprogramma −90%, alcoholtoezicht −90%, verkennend onderzoek Wvggz −90%, mantelzorgsteun −95%, Meerschap Paterswolde (GR) −30%, kapitaallasten in extra geld mobiliteit −50%, Forum en schouwburg (gebouwen) −85% en −90%.
    - **Ruimer dan eerst** (de oude grens had geen grond): jeugdzorg, Wmo en Veilig Thuis −20%, beschermd wonen −15%, opvang −25%, GGD −30%, WIJ-teams −60%, inburgering −20%, schoolgebouwen −20%, overhead −40%, college −64% (burgemeester en twee wethouders), gemeenteraad −43% (45 raadsleden, vergoeding van het Rijk), klantcontactcentrum −75%, RO-ambtenaren −75%, Suikerzijde −65%. Leerlingenvervoer zit niet meer vast: −10% (eigen bijdrage, strengere regels).
    - **Naar nul** (spelgrens zonder wettelijke of vaste reden): ambtenaren economische zaken, markten en brugbediening, strategisch bezit.
    - Posten waarvan schrappen geld kost, blijven bij nul staan (bedrijfsafval, parkeercontrole, reclamezuilen); de game rekent dat zelf uit.
    - Bij nul hield je eerst € 261 mln tot € 368 mln over; met de belastingen op nul is dat minder (zie hieronder).
    - Bijna alle percentages zijn een **aanname** (⚠︎): de wet zegt meestal dat een taak er moet zijn, niet hoeveel. De onderbouwing staat in `minimum.berekening`. *Vraag:* wil de fractie de grootste laten narekenen met het boekwerk (jeugdzorg, Wmo, overhead, sport, schoolgebouwen)?
    - Op elke schuif staat een knopje "college": daar zit de begroting van het college, en één tik zet de post terug.
    - **Belastingen op het wettelijke minimum: nul.** De Gemeentewet zegt bij OZB (art. 220), toeristenbelasting (224), parkeerbelasting (225), reclamebelasting (227) en precario (228) dat de gemeente ze "kan" heffen; een plicht is er niet. Bij nul staan ze dus op −100%, en de parkeertarieven ook. Afval en riool blijven vast (kostendekkend). De ondergrens van de OZB was −30% (spelgrens) en is nu −100%. Bij nul heb je daardoor € 96 mln (2026) tot € 203 mln (2027) te verdelen, en kies je zelf welke belastingen je heft.
59. **Beleidshuis.** Een nieuw gebouw (in Hoogkerk) met de beleidskeuzes uit de optielijst van de fractie die een eigen bedrag in de begroting 2026 hebben (groningen.begroting-2026.nl). Per thema gezocht en daarna gecontroleerd op bedrag, bron en dubbeltelling.
    - **21 programma's binnen een post** (`beleidsprogrammas`), bijvoorbeeld het groenplan Vitamine G (o6, € 0,5 mln), het Museum aan de A (SIA in g7), jeugdboa's (v5) en de subsidie van het Groninger Museum (c2, ⚠︎). Een programma dat elk jaar loopt, is een snelkoppeling naar de schuif van zijn post: stopzetten verlaagt de post, aanzetten verhoogt hem. Een eenmalig programma (intensivering 2026, bijvoorbeeld het preventiefonds jeugd € 4,5 mln) scheelt alleen in 2026, en alleen zolang de post boven zijn minimum zit. Zo telt niets dubbel. Bij nul staan alle programma's stil.
    - **21 nieuwe plannen** (actiekaarten met `gebouw: "beleid"`), bijvoorbeeld stoppen met het Young Professional Programma (€ 0,68 mln), de eigen ombudsman (⚠︎), de bijdrage aan het Fonds Ondernemend Groningen (€ 3,3 mln), de pandenbrigade en Veilig Uitgaan.
    - Niet opgenomen: opties zonder eigen bedrag, wettelijke delen van posten, en wat al een schuif of kaart heeft. De redenen per optie staan in de uitkomsten van het onderzoek; de koppeling per optie staat in `docs/OPTIES-KOPPELING.md`.
    - *Vraag:* de bedragen zijn van de begroting 2026. Bij de begroting 2027 opnieuw nalopen.

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
| Missies | Vervallen: iedereen maakt een eigen begroting. | Punt 47. |
| Campagne | Vervallen: de knop "Speel vier jaar" is eruit (1 oktober 2026). | Punt 51. |
| Bouwleges | 100% kostendekkend, dus vast, net als de doelbelastingen. | Punt 52: `w8` vergrendeld. |
| Gebeurteniskaarten | Helemaal weghalen. | Punt 51. |
| 30. Tarieven | Pas op "feit" als iemand de bedragen in het raadsvoorstel *Belastingtarieven 2026* heeft gezien; COELO is niet genoeg. | Blijft "te controleren". |
| 37. Inwoners op de kaart | 30 seconden lopen na een actie, daarna stil: goed zo. | Zo gebleven. |
| 50. Extra woningen | Ook meer RO-ambtenaren moet woningen opleveren; beleidskeuzes volgen. Getal nog onbekend. | Punt 53. |
| 50. WOZ nieuwe woning | Rekenen met de WOZ-waarde van nieuwbouw. | Punt 54: factor 1,32. |
| 50. Inwoners per woning | 1,93 (het gemiddelde). | Zo gebleven. |
| 23. Water | Echte waterlijnen uit PDOK. | Gedaan. |
| Netlify | Eerst hier verbeteren, daarna met de hand uploaden. | Open. |
| Maximum op uitgaven | Geen plafond, tenzij het echt niet kan (zoals het maximum aantal wethouders). | Punt 56. |
| Beginnen bij nul | Optie om bij de wettelijke taken te beginnen, met aan het eind het verschil met de begroting van het college. | Punt 57. |
| Beleidshuis | Een gebouw met programma's en plannen die je stopzet of aanzet. | Punt 59. |
| Standaard bij nul | Bij nul is de standaard; wettelijke plichten zoals uitkeringen op het minimum. | Punt 58. |
| Blije inwoners | Eerst weglaten; later misschien anders. | Punt 46. |
| Bedragen | Naast het percentage ook een bedrag kunnen invullen. | Punt 48. |
| Fase 7. Video | Geen persoonlijke video; de tegenbegroting blijft als Word, pdf en afbeelding. | `docs/VIDEO-ONTWERP.md` bewaard, niet gebouwd. |
