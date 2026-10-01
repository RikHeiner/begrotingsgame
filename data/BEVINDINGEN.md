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

## F. VVD-tegenbegroting (zie ook `npm run vvd:check`)

20. 13 posten hebben geen schuif of kaart in de game, onder andere 5% minder ambtenaren (16,4) en cultuur 20% (15,2). Die moeten een kaart of schuif worden.
21. Buiten de grenzen van de game: precario −111% (2,0 mln tegenover 1,8 mln opbrengst), armoederegelingen +34% (max +25%), en de autowerkplaats (geen netto lasten, dus niet als percentage te vertalen).
22. Overhead 5% is in de tegenbegroting 7,0 mln (bruto, heel deelprogramma 4.4). Op de schuif h1 is dat −5,7%. Dat past binnen de grenzen.

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
