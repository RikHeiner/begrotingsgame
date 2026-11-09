# Financiële controle tegenbegroting 2027 VVD Groningen (versie def1)

Gecontroleerd: `def1.docx` / `def1.txt` (9 november 2026), de drie tabellen, de lopende tekst en de teksten op de vier omslagafbeeldingen in het docx.
Getoetst aan: begrotingsdata van de game (`data/begroting-2027.json`, paginanummers uit het veld `bron`), Iv3-staat 2027 (`iv3.xlsx`), raadsvoorstel Belastingtarieven 2027 (`bt.txt`), `apparaat-`, `parkeren-` en `tarieven-2027.json`, `dwarsverbanden.json` en de rekenmotor (`src/engine`).
Methode: alle regels nagerekend; daarnaast de keuzes van het document met de rekenmotor van de game doorgerekend (script: `/tmp/claude-0/-home-user-begrotingsgame/4d27a988-6c08-5dbf-9c0b-730d6915427e/scratchpad/fincheck/recon.ts`, varianten `doc` en `model`, te draaien met `npx tsx` vanuit de repo). Het docx is niet gewijzigd.
Alle bedragen x 1 miljoen euro, tenzij anders vermeld.

---

## 0. Oordeel in het kort

- **Rekenkundig** sluiten alle drie tabellen: totalen, S en I apart, en de meerjarentabel tegen de twee jaartabellen. Er is één kapotte cel.
- **Boekhoudkundig** zit er één fundamentele fout in. De verkoop van 49% van WarmteStad tegen boekwaarde (37,975) is volgens het BBV geen bate. Dat geld kan dus ook niet via het saldo in de reserves worden gestort. De kernboodschappen hangen ervan af: overschot 2027 van 39,1, storting in de reserves, "€ 122,4 miljoen aan ombuigingen en opbrengsten" (omslag 01) en "€ 140,8 miljoen naar de reserves" (omslag 04 en tekst).
- **Met alleen de BBV-correctie** wordt het overschot 2027 1,2 (geen 39,1). Cumulatief 2027-2030 blijft dan 105,7 over, inclusief 2,8 rentevoordeel omdat de gemeente minder hoeft te lenen.
- **Met de rekenregels van de eigen begrotingsgame** zijn de keuzes doorgerekend met restkosten opvang, frictiekosten volgens het model en het parkeereffect. Dan is 2027 **−2,4: niet sluitend**. De game meldt dan "je eenmalige uitgaven zijn € 2,4 mln hoger dan je dekking". Cumulatief komt het uit op 99 tot 104.
- **"De reserves groeien met 140,8"** is bovendien een verschil ten opzichte van de ontwerpbegroting en geen groei van de reserves. De ontwerpbegroting teert zelf in 2027-2030 per saldo 20,9 in op het eigen vermogen, en heeft in 2029-2030 samen 18,0 tekort (p. 353). De werkelijke groei van het eigen vermogen ligt na correcties rond 68 tot 85.
- De meerjarentabel is volledig te reproduceren, maar bevat posten die nergens in de tabellen of de tekst staan. Er is ook een klein onverklaard bedrag.

---

## Overzicht van alle bevindingen naar ernst

### KRITIEK
| nr | Bevinding | Zie |
|---|---|---|
| K1 | Verkoop 49% WarmteStad tegen boekwaarde (37,975) staat als incidentele opbrengst in de exploitatie en wordt "in de reserves gestort". Volgens het BBV is alleen een boekwinst (verkoopprijs min boekwaarde) een bate; tegen boekwaarde is die nul. Het is een activaruil: deelneming eruit, geld erin of minder schuld. Het eigen vermogen en de weerstandscapaciteit veranderen niet. De eigen game-kaart rekent hier ook 0 als bate, plus rentevoordeel. | (c), (b) regel 21 |
| K2 | Kapotte cel in de meerjarentabel: "waarvan structureel 2027" toont **"−0,331,427"**. Dat is de oude waarde "−0,33" met de nieuwe waarde "1,427" erachter geplakt. Moet zijn: **1,427**. | (a) |
| K3 | De kernclaims "39,1 storten in 2027" en "over 2027-2030 groeien de reserves met 140,8" (tekst en omslag 04) kloppen niet. Er zijn twee oorzaken. (1) Er zit 38,0 in die geen bate is (K1). (2) Het is een verschil met een ontwerpbegroting die zelf interen op het eigen vermogen (−22,7 / −4,3 / +1,7 / +4,4) en die in 2029-2030 tekorten heeft (−7,8 / −10,1). Na de BBV-correctie daalt het eigen vermogen in 2027 nog steeds, met ongeveer 21,5. | (c), (d) |

### BELANGRIJK
| nr | Bevinding | Zie |
|---|---|---|
| B1 | Het structurele saldo 2027 (1,427) is kwetsbaar en wordt soms anders geclassificeerd. "Kettingeffect: subsidies afbouwen" (8,70) speelt alleen in 2027 en is dus incidenteel. De restkosten van de opvang (model −1,12 S) ontbreken. De eigen afbouwregel voor subsidies ("kwart in 2027") is niet toegepast op diversiteit ("vooral subsidies"), duurzaamheidseducatie en energiesubsidies: tot −2,36. Daardoor kan "1,4 structureel in 2027" omslaan naar een tekort. | (c), (e) |
| B2 | De frictiekosten (4,105) zijn niet te herleiden. Het model geeft 8,40, en dan alleen voor de overhead. Als je de regel van het model consequent toepast op alle personeelsbezuinigingen (overhead, CDOKE, vacaturestop): 24,6 / 16,4 / 8,2 in 2027-2029. De collegebezuiniging van 10% gebruikt daarbij hetzelfde natuurlijk verloop. | (e) |
| B3 | Opvang ongedocumenteerden: de restkosten uit het model (20% van 5,6 = 1,12 per jaar) ontbreken. De "5,0 in 2028" staat niet in de begrotingsdata; volgens de data staat het geld alleen in 2026-2027 in de begroting. Verifiëren op p. 122 en in het intensiveringenoverzicht op p. 297-299. | (b), (e) |
| B4 | Energiebedrijf (0,201 in 2027) komt uit de begroting 2026: incidenteel voor alleen 2026, en gedekt uit het programma energie. In de begroting 2027 is het niet aangetoond. In de eigen fractie-analyse van 1 november (`Tegenbegroting_fractie_gezamenlijk_v2.xlsx`, tabblad Posten) stond het als "vervallen: intensivering 2026; niet in 2027". Waarschijnlijk is dit een besparing die niet bestaat. | (b) |
| B5 | OZB: 25,154 = 139,441 × (1 − 0,9 / (1,0458 × 1,05)). Volgens de tarieven in het raadsvoorstel stijgt de gemiddelde aanslag met 9,3% (woningen) en 7,2 tot 7,8% (niet-woningen). "10% lager dan 2026" kost dan ongeveer **23,7** (12,5 woningen en 11,2 niet-woningen). Met 25,154 wordt het woningen −10,4% en niet-woningen −11,6% (eigenaren) en −12,1% (gebruikers). Dat is in de voorzichtige richting, maar de methode en de verdeling 12,8 / 12,4 sluiten niet aan op het raadsvoorstel. | (b) regel U1 |
| B6 | Parkeren. De vergunningen (0,542) kloppen exact. Kortparkeren (5,255) veronderstelt een gemiddelde stijging in 2027 van 15,7%; de weging van de +20%-gebieden is niet controleerbaar. Garages (1,998) veronderstellen +16,5% in 2027, maar het raadsvoorstel bevat geen garagetarieven. Bij +4,58% is het 1,223, zonder stijging 0,878. De grondslagen (23,635 en 8,775) zijn modelaannames die "nog na te lopen" zijn. | (b) |
| B7 | Weerstandsvermogen. 32,5 klopt alleen als je 25% neemt van het midden van de bandbreedte (86,5); dat staat niet in de tekst. 15,5 voor Enexis klopt alleen als 50 al de gewogen (72,5%) waarde is. Volgens de speldata is 50 de volledige stille reserve, en dan daalt de capaciteit 11,25 (ratio ongeveer 114%). 111% vereist een beschikbare capaciteit van ongeveer 191 en een benodigde van ongeveer 126; dat is niet te controleren (p. 193-197). | (f) |
| B8 | Basisbanen schrappen (6,7): het model voorziet terugval in de bijstand (60%), maar kan die niet doorrekenen omdat het aantal deelnemers ontbreekt. Het document negeert de terugval. Per 100 deelnemers kost dat ongeveer 1,0 per jaar (60 × € 16.500). | (e) |
| B9 | Minder wethouders: de aanname "geen wachtgeld" is juridisch niet houdbaar. Wachtgeld is een recht volgens de Appa en wordt alleen verrekend met nieuw inkomen. Daarnaast is 2 van 8 wethouders ongeveer 21% van de post College van B&W, omdat daar ook de burgemeester in zit: 0,51 in plaats van 0,6. | (e), (b) |
| B10 | De meerjarentabel bevat posten die nergens worden genoemd: tegenprestatie (0 / 0,82 / 1,65 / 1,65), overhead werkplaats (0,99 per jaar vanaf 2028), gemeentefonds (−0,21 / −0,48 / −0,68), toeristenbelasting (−0,15), preventie jeugdzorg (+0,04 / +0,08) en een onverklaarde −0,0675 per jaar. De paragraaf met uitgangspunten uit v2 ontbreekt. Voor de werkplaats rekent de code 10% van 9,9 (0,99), terwijl de formule in de data 10% van 0,9 (0,09) geeft. | (d) |
| B11 | Jeugdzorg: "17,5 in 2030" is niet te controleren. Het document noemt die taakstelling onhaalbaar, maar laat haar in de basis staan. 12,6 extra dekt in 2030 maar 72% ervan en kan niet ook nog de achterstanden wegwerken. | (f) |
| B12 | Taakstellingen en tempo: overhead, concernposten, cultuur, armoede, IIT, bijzondere bijstand en apparaat zijn niet ingevuld, en ze gaan grotendeels al per 1-1-2027 in. Volgens het toezichtkader (GTK 2020) moet een begroting reëel zijn. Risico's: meerjarige cultuurbeschikkingen, verordeningen per 1-1-2027 en lopende contracten (basisbanen, ICT, huisvesting). | (c) |
| B13 | Veegkosten (2,08) zijn niet te controleren: het raadsvoorstel geeft geen bedrag. Het bedrag is wel plausibel. | (b), (f) |
| B14 | "Formatiereductie van 10%, oplopend tot 21,75 in 2030" is niet te controleren en intern niet consistent: 10% van de loonsom is 35,8. | (f) |

### KLEIN
Opmaak (decimalen en volgorde), afwijkend lettertype en Google-inhoudsbesturingselementen in de min-cellen, een niet-optelbare "waarvan"-regel, de "Uitgaven"-tabel die lagere baten bevat, constante kapitaallasten voor de camera's, de grondslag leefkwaliteit (3,2 in plaats van 4,0), weggelaten gunstige effecten (parkeerelasticiteit +1,84 per jaar, rente op stortingen, dierenartskosten 2028-2030), meegroeiende baten bij investeringen (onderhoud, jeugd en veiligheid), BBV-punten bij Masterplan sport, FC Groningen en milieustraten, de opslag voor het Fonds Ondernemend Groningen in de OZB, de financiering van CDOKE, de dekking uit het SIF (Oosterhamrikzone), het niet vermelde prijspeil en enkele niet controleerbare feiten in de tekst. Zie de secties hieronder.

---

## (a) Rekenkundige fouten

### Optellingen: allemaal juist

| Tabel | S | I | Totaal | Document |
|---|---|---|---|---|
| Ombuigingen en opbrengsten 2027 | 78,560 | 43,826 | 122,386 | 122,386, klopt |
| Uitgaven 2027 (excl. storting) | 77,133 | 6,105 | 83,238 | 83,238, klopt |
| Uitgaven 2027 incl. storting 39,148 | | | 122,386 | 122,386, klopt |

Meerjarentabel (alle rijen nagerekend):

| | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|
| Totaal ombuigingen = S + I | 122,386 klopt | 95,705 klopt | 101,698 klopt | 111,386 klopt |
| Totaal uitgaven = S + I | 83,238 klopt | 68,814 klopt | 69,045 klopt | 69,251 klopt |
| Saldo = ombuigingen − uitgaven | 39,148 klopt | 26,891 klopt | 32,653 klopt | 42,135 klopt |
| waarvan structureel (S − S) | **1,427 (cel kapot)** | 21,891 klopt | 32,653 klopt | 42,135 klopt |
| waarvan incidenteel (I − I) | 37,721 klopt | 5,0 klopt | 0 klopt | 0 klopt |
| Cumulatief | 39,148 klopt | 66,039 klopt | 98,692 klopt | 140,827 klopt |

De jaartabellen en de meerjarentabel sluiten op elkaar aan: S 2027 78,56 en 77,133; I 2027 43,826 en 6,105. De storting (39,148) is gelijk aan het saldo 2027.

### Fouten en onvolkomenheden
1. **KRITIEK: kapotte cel.** In het docx staat in de rij "waarvan structureel", kolom 2027, de tekst `−0,331,427`. In de vorige versie (nieuw3, 9 november) stond daar `−0,33`. Na de wijziging van onderhoud van 15% naar 12,5% (−1,757) is `1,427` erachter getypt in plaats van de oude waarde te vervangen. Juist is **1,427**.
   Technisch: de cel en de min-cellen "−14,303", "−0,246" en "−0,201" staan in Google-Docs-inhoudsbesturingselementen (`w:sdt`, tag `goog_rdk_*`), in lettertype "Arial Unicode MS" terwijl de rest Arial is. python-docx leest deze cellen als leeg. Wie de tabel automatisch overneemt, bijvoorbeeld voor een website of persbericht, kan de waarden kwijtraken. Advies: de inhoudsbesturingselementen verwijderen en de waarden in Arial zetten.
2. **KLEIN:** de rij "waarvan kettingeffecten en frictiekosten" overlapt met de twee rijen erboven en telt dus niet op (1,427 + 37,721 − 14,303 ≠ 39,148). Noem deze rij expliciet "(overlappend, ter informatie)".
3. **KLEIN:** de decimalen zijn niet consistent ("8,70", "0,30", "2,0", "1,4" naast drie decimalen). De volgorde op grootte klopt niet meer na de wijziging: onderhoud 8,788 staat boven jeugdzorg 12,59; IIT 1,26 boven concernposten 2,36; toeristenbelasting 0,30 boven boa's 0,37; leefkwaliteit 0,16 boven camera's 0,192; veegkosten 2,08 staat onderaan de S-regels.
4. Geen tikfouten gevonden in de bedragen. Alle getallen in het docx en in def1.txt zijn identiek (automatisch vergeleken).

---

## (b) Controle per tabelregel

Netto basis is lasten min gekoppelde baten uit `begroting-2027.json` (pagina = bron in de data). Het percentage in elke omschrijving klopt met de lopende tekst; dat is per regel gecontroleerd en er is geen afwijking.

### Ombuigingen en opbrengsten

| # | Regel | Bedrag | Basis | Berekening en aanname | Oordeel |
|---|---|---|---|---|---|
| 1 | Overhead 20% | 26,3 S | h1 Overhead 134,9 − 3,4 = 131,5 (p. 156) | 20% × 131,5 = 26,30; volledig in 2027 | Rekenkundig juist. Volledig in 2027 is meer dan natuurlijk verloop toelaat (B2). Bevat ook ICT en huisvesting (Iv3 0.4: 82,9 salarissen op 136,5 lasten), maar telt volledig mee als "minder ambtenaren" (KLEIN). |
| 2 | Cultuur 40% | 11,6 S | c2 Cultuurnota 29,0 (p. 139) | 40% × 29,0 = 11,60 bruto; via kettingeffect −8,70 in 2027 netto 2,9 | Juist; "kwart in 2027" klopt. Looptijd van de cultuurnota-beschikkingen niet gecontroleerd (B12). |
| 3 | Apparaat 20% (oplopend) | 9,687 S | loonsom 357,948 (p. 355) | (20% × 357,948 − 26,3 − 6,54) = 38,750; × 25% = 9,687; ingroei 25/50/75/100% (aanname) | Juist; in 2030 samen met regel 1 en 5: 71,59 = 20% van de loonsom. Haalbaarheid: B2. |
| 4 | Basisbanen 100% | 6,7 S | s6 9,4 − 2,7 = 6,7 (p. 90) | 100% | Rekenkundig juist; terugval in de bijstand ontbreekt (B8). |
| 5 | CDOKE 60% | 6,54 S | w12 10,9 (p. 45) | 60% × 10,9 | Juist. |
| 6 | Armoede en minima 30% | 4,17 S | s10 15,5 − 1,6 = 13,9 (p. 91) | 30% × 13,9 | Juist (taakstelling, niet ingevuld). |
| 7 | IIT 30% | 1,26 S | s12 4,2 (p. 91) | 30% × 4,2 | Juist; tekst "4,2" klopt. Dat een langere referteperiode 30% oplevert, is niet onderbouwd. |
| 8 | Concernposten 40% | 2,36 S | g7 5,9 (p. 151) | 40% × 5,9 | Juist; samenstelling concernposten onbekend (p. 151). |
| 9 | Natuur- en duurzaamheidseducatie 100% | 1,4 S | d6 1,4 (p. 101) | 100% | Juist; als dit subsidies zijn, geldt ook de afbouwregel (B1). |
| 10 | Intensiveringsmiddelen mobiliteit 25% | 1,393 S | m3 5,57 (p. 35) | 25% × 5,57 = 1,3925 | Juist (tekst 1,4). Volgens de speldata is ongeveer de helft kapitaallasten; 25% blijft daaronder. |
| 11 | Bijzondere bijstand 25% | 1,36 S | s11 5,9 − 0,46 = 5,44 (p. 91) | 25% × 5,44 | Juist; precies op de ondergrens van het model; open-einde-recht (art. 35 Pw). |
| 12 | Diversiteit 85% | 1,19 S | z10 1,4 (p. 123) | 85% × 1,4 | Juist; tekst 1,4 klopt; "vooral subsidies", dus afbouw (B1). |
| 13 | Energietransitie 40% | 0,92 S | w7 2,3 (p. 45) | 40% × 2,3 | Juist. |
| 14 | Mobiliteitsvisie 55% | 0,858 S | m4 1,56 (p. 35) | 55% × 1,56 | Juist. |
| 15 | Strategisch bezit 35% | 0,84 S | e7 11,7 − 9,3 = 2,4 (p. 23) | 35% × 2,4; kosten en huur dalen naar rato | Juist; tekst 11,7 / 9,3 / 2,4 klopt. |
| 16 | Minder wethouders 25% | 0,6 S | g1 2,4 (p. 151) | 25% × 2,4 | Rekenkundig juist; 2 van 8 wethouders is ongeveer 21% van g1 omdat de burgemeester erin zit (≈ 0,51); wachtgeld (B9). |
| 17 | Energiesubsidies 55% | 0,55 S | w6 4,3 − 3,3 = 1,0 (p. 45) | 55% × 1,0 | Juist (netto; het model laat ook 55% van het externe geld meedalen, de tekst niet: netto hetzelfde). |
| 18 | Kettingeffect begeleiding naar werk | 0,482 S | s3 +10% = 2,38 | 2,38 / 0,008 × 0,3 = 89 huishoudens × (16.500 + 1.500 euro) × 30% ingroei | Juist volgens het model (wia_reintegratie; gem_uitkering is "te onderzoeken"). 2028: 1,125; vanaf 2029: 1,607. |
| 19 | Oosterhamrikzone 100% | 0,25 S | m9 "SIF-middelen" 0,25 (p. 35) | 100% | Rekenkundig juist. Als dit gedekt wordt uit de bestemmingsreserve SIF, heeft schrappen geen saldo-effect, tenzij ook de storting in het SIF daalt (KLEIN, verifiëren). |
| 20 | Campus Camera | 0,1 S | begroting 2026, intensivering 3 (S, 2026-2029) | – | Bedrag volgt de bron uit 2026; dat het in de begroting 2027 staat, is niet aangetoond (p. 297-299). |
| 21 | Verkoop 49% WarmteStad | 37,975 I | boekwaarde deelneming 77,5 per 1-1-2027 (p. 247) | 49% × 77,5 = 37,975; verkoop tegen boekwaarde | **Rekenkundig juist, boekhoudkundig fout (K1).** Bate = 0; vanaf 2028 rentevoordeel ongeveer 0,949 per jaar (2,5%, parameter van de game). |
| 22 | Opvang ongedocumenteerden | 5,6 I | k_ongedoc 5,6 I (p. 122) | – | Juist voor 2027. Restkosten ontbreken; 2028 (5,0) staat niet in de data (B3). |
| 23 | Dierenartskosten | 0,05 I | intensivering 47: I, 0,05 per jaar 2027-2030 (p. 298) | – | Juist; ook in 2028-2030 vrij te spelen (0,15), niet meegeteld (KLEIN, voorzichtig). |
| 24 | Energiebedrijf | 0,201 I | begroting 2026, intensivering 7: I 2026, dekking uit programma energie +0,201 | – | **Waarschijnlijk niet in de begroting 2027 en budgetneutraal (B4).** |
| 25 | Glaudé- en Vapianopanden | PM I | – | – | PM is verdedigbaar. Bij verkoop is alleen verkoopprijs min boekwaarde een bate; een boekverlies is mogelijk. |
| | **Totaal** | **122,386** | | S 78,560 + I 43,826 | Klopt. |

### Uitgaven

| # | Regel | Bedrag | Basis | Berekening en aanname | Oordeel |
|---|---|---|---|---|---|
| U1 | OZB −10% t.o.v. 2026 | 25,154 S | OZB 139,441 (p. 5 en 275); Iv3 0.61 woningen 70,759 en 0.62 niet-woningen 68,682 | 139,441 × (1 − 0,9 / (1,0458 × 1,05)) = 25,154. Aanname: de opbrengst 2027 is de opbrengst 2026 × 1,0458 × 1,05 (gestapeld), zonder areaal of correcties | Reconstructie klopt; verdeling 12,765 / 12,390 klopt met Iv3. **Methode sluit niet aan op de tarieven van het raadsvoorstel (B5):** woning 0,1501% tegen 0,1473% bij +7,30% waarde geeft +9,3% per aanslag; eigenaren niet-woning +7,8%; gebruikers +7,2%. −10% t.o.v. 2026 kost ongeveer 23,7 (12,5 en 11,2). Additief (9,58%) zou 24,9 geven. Tarieven bij −10%: 0,1236% / 0,4824% / 0,3858%; tarieven bij het documentbedrag: 0,1230% / 0,4736% / 0,3767%. |
| U2 | Onderhoud openbare ruimte 12,5% | 8,788 S | o1 72,4 − 2,1 = 70,3 (p. 61) | 12,5% × 70,3 = 8,7875 | Juist. Aanname: de gekoppelde baten (2,1) groeien mee; anders 9,05 (KLEIN). |
| U3 | Jeugdzorg 10% | 12,59 S | z1 127,7 − 1,8 = 125,9 (p. 120) | 10% | Juist (tekst 12,6). |
| U4 | Kettingeffect subsidies afbouwen | 8,70 S | c2 −40% = 11,6 | 11,6 × (1 − 0,25) (jur_subsidies, alleen 2027) | Juist volgens het model; speelt alleen in 2027, dus incidenteel (B1). |
| U5 | Kortparkeren −10% t.o.v. 2026 | 5,255 S | 27,524 (parkeerbelasting, p. 5; Iv3 0.63) − 3,889 vergunningen = 23,635 (modelaanname) | 5,255 = 22,2% van de basis, dus impliciet 2027 = 2026 × 1,157. Dat past bij ongeveer 72% van de opbrengst in de +20%-gebieden en +4,58% elders | Niet controleerbaar: opbrengst per gebied en tarievenbijlage ontbreken (B6). |
| U6 | Intensieve coaching 10% | 2,38 S | s3 23,8 (p. 89) | 10% | Juist (tekst 2,4). |
| U7 | Masterplan sport | 2,0 S | geen begrotingspost | eigen raming | Gelijk aan de tekst. Bij investeringen eist het BBV activeren en kapitaallasten (KLEIN). |
| U8 | Kettingeffect bedrijfsafval | 1,98 S | o4 lasten 9,9 | 100% × 9,9 × 0,2 (aandeel vaste kosten, "te onderzoeken") | Juist volgens het model. |
| U9 | Garages −10% t.o.v. 2026 | 1,998 S | 36,299 − 27,524 = 8,775 ("volgens de fractie" garages; data: nog na te lopen) | 1,998 = 22,8%, dus impliciet +16,5% in 2027 | **Onverklaard (B6):** het raadsvoorstel bevat geen garagetarieven. Bij +4,58%: 1,223; zonder stijging: 0,878. Volgens Iv3 heeft taakveld 2.2 Parkeren 16,9 aan baten, waarvan 11,7 "leges en andere rechten"; ook de basis is dus onzeker. |
| U10 | Zakelijke dienstverlening 100% | 1,2 S | o4 9,9 − 11,1 = −1,2 (p. 62) | gemiste marge | Juist. |
| U11 | Reclamebelasting | 0,98 S | 0,98 (p. 5) | 100% | Juist. |
| U12 | Openbare orde en veiligheid 10% | 0,57 S | v3 5,7 (p. 72) | 10% | Juist (camera's ook in U20 en U23: KLEIN). |
| U13 | Vergunningen −10% t.o.v. 2026 | 0,542 S | 3,889 (aantallen 2025 × tarieven 2026 × 1,0458) | 3,889 × (1 − 0,9/1,0458) = 0,542 | Juist; indexatie 4,58% volgt het raadsvoorstel (besluitpunt XII). |
| U14 | Milieustraten | 0,5 S | eigen raming | – | Gelijk aan de tekst; zou normaal via de afvalstoffenheffing lopen (KLEIN). |
| U15 | Toeristenbelasting −10% | 0,30 S | 2,998 (p. 5; Iv3 3.4: 3,000) | 10% × 2,998; aanname: tarief 2027 = 2026 (€ 4,65), het raadsvoorstel indexeert de logiesbelasting niet | Juist. |
| U16 | Boa's 10% | 0,37 S | v2 3,7 (p. 72) | 10% | Juist. |
| U17 | Burgerzaken 5% | 0,295 S | b1 5,9 (p. 147) | 5% | Juist. |
| U18 | Jeugd en veiligheid 10% | 0,28 S | v5 4,3 − 1,5 = 2,8 (p. 71) | aanname: het rijksgeld (1,5) groeit 10% mee | Juist volgens het model; groeit het rijksgeld niet mee, dan 0,43 (KLEIN). |
| U19 | Precario −10% t.o.v. 2026 | 0,26 S | 1,866 (p. 5) | 1,866 × (1 − 0,9/1,0458) = 0,260 | Juist; indexatie volgt het raadsvoorstel (besluitpunt X). |
| U20 | Camera's kapitaallasten | 0,214 S | aanname: 50 camera's × € 19.000 (prijzen Nijmegen) = 0,95; 5 jaar; 2,5% rente | 0,95/5 + 2,5% × 0,95 = 0,214 | Rekenkundig juist. Investering en aannames staan nergens in de tekst. Volgens het BBV dalen de lasten (0,209 / 0,204 / 0,200); in de meerjarentabel constant (KLEIN). |
| U21 | KCC 5% | 0,205 S | b2 4,1 (p. 147) | 5% | Juist. |
| U22 | Leefkwaliteit 5% | 0,16 S | Meerjarenprogramma Leefkwaliteit 3,2 (p. 62) | 5% × 3,2 = 0,16 | Juist op 3,2, dus zonder bodembeheer 0,8; past bij "groen en spelen". De game rekent met o6 = 4,0, dus 0,20 (KLEIN). |
| U23 | Camera's uitkijken en onderhoud | 0,192 S | aanname Nijmegen | 50 × (3.000 + 15.000/18) = 0,192 | Rekenkundig juist. |
| U24 | Ondermijning 10% | 0,14 S | v4 1,4 (p. 71) | 10% | Juist. |
| U25 | Veegkosten niet doorberekenen | 2,08 S | niet in het materiaal | – | **Niet controleerbaar (B13).** Plausibel: riool boven indexatie 25,81 × (1 − 1,0458/1,0811) = 0,84; afval boven indexatie ongeveer 2,05, maar dat is inclusief verbrandingsbelasting en CO₂-heffing. Nodig: kostendekkendheidsberekening (paragraaf lokale heffingen, p. 275 e.v.). |
| U26 | Frictiekosten | 4,105 I | – | niet te herleiden | **Model: 8,40 (alleen overhead); bij consequente toepassing hoger (B2).** |
| U27 | FC Groningen | 2,0 I | eigen raming | – | Gelijk aan de tekst; als incidenteel juist; staatssteuntoets nodig (KLEIN). |
| U28 | Verbeteren financiële positie | 39,148 I | saldo | 122,386 − 83,238 | Rekenkundig juist; bevat 37,975 die niet bestaat (K1). Dit is een reservemutatie, geen uitgave. |
| | **Totaal** | **122,386** | | S 77,133; I 6,105 + 39,148 | Klopt. |

### Belastingregels "ten opzichte van 2026": achterliggende aanname per regel

| Regel | Aangenomen stijging 2027 t.o.v. 2026 | Bron of klopt dat? |
|---|---|---|
| OZB | 1,0458 × 1,05 = +9,81% op de opbrengst | Raadsvoorstel: indexatie 4,58% plus 5% extra. De tarieven geven per gemiddelde aanslag +9,3% (woningen) en +7,2 tot 7,8% (niet-woningen), mede door de +1 mln voor grote ontwikkelingen. Afwijkend (B5). |
| Precario | +4,58% | Klopt (besluitpunt X). |
| Toeristenbelasting | 0% | Klopt: niet geïndexeerd in het raadsvoorstel, alleen het belastbaar feit is verruimd. |
| Vergunningen | +4,58% | Klopt (besluitpunt XII). |
| Kortparkeren | +15,7% gemiddeld | +20% in Binnenstad, Binnenstad-Oost, Hortusbuurt en Stationsgebied klopt. Elders "reguliere indexatie" zonder percentage. De weging is niet controleerbaar. |
| Garages | +16,5% | Niet in het raadsvoorstel; onverklaard. |

---

## (c) Boekhoudkundige problemen (BBV, Gemeentewet)

### KRITIEK
**C1. Verkoop 49% WarmteStad (37,975) is geen bate (K1).**
- Een deelneming staat tegen verkrijgingsprijs (boekwaarde) op de balans. Bij verkoop is alleen het verschil tussen opbrengst en boekwaarde resultaat; dat is een incidentele bate of last. Tegen boekwaarde is het resultaat nul. De 37,975 is een balansmutatie: de financiële vaste activa dalen en de liquide middelen stijgen of de schuld daalt. In het overzicht van baten en lasten zie je dat niet terug.
- Daarom kan het geld ook niet "in de reserves gestort" worden. Een reserve groeit alleen uit een positief saldo van baten en lasten. Het eigen vermogen verandert niet en de weerstandscapaciteit ook niet, want een boekwaarde telt daar niet in mee.
- Wat wel kan: met de opbrengst schuld aflossen of minder lenen. Volgens de parameter van de game is dat 2,5% × 37,975 = 0,949 per jaar, vanaf 2028 (structureel zolang de schuld lager blijft). De eigen game-kaart `k_verkoop_warmtestad` rekent precies zo: bedrag 0, plus rentevoordeel.
- Gevolg: saldo 2027 39,148 wordt 1,173. "€ 122,4 mln aan ombuigingen en opbrengsten" (omslag 01) wordt 84,4. De storting 2027 wordt hooguit 1,2. Cumulatief 140,8 wordt 105,7 (inclusief rente).
- Aanvullend risico: tegen boekwaarde verkopen is een aanname. Marktwaarde onder de boekwaarde betekent een boekverlies, dus een incidentele last. Komt de kapitaalverstrekking van 36,5 vóór de verkoop, dan stijgt de boekwaarde. Dat verandert de kasopbrengst, niet het resultaat (p. 247).

**C2. De claim "reserves groeien met 140,8" (K3).**
- Het saldo in de meerjarentabel is het verschil met de ontwerpbegroting. De ontwerpbegroting heeft zelf een saldo van baten en lasten (dat is de mutatie van het eigen vermogen) van −22,690 / −4,302 / +1,732 / +4,403, samen −20,857, en een geraamd resultaat van 0 / 0 / −7,825 / −10,129 (p. 353). Het document schrijft zelf dat "de begroting vanaf 2029 niet meer sluitend is".
- Werkelijke groei van het eigen vermogen 2027-2030 is dus 140,8 − 38,0 + 2,8 − 20,9 ≈ **84,8** (aannames document). Met ook de modelcorrecties en de te verifiëren posten wordt het ongeveer 68 tot 84 (zie (d)).
- In 2027 daalt het eigen vermogen na de BBV-correctie nog: −22,69 + 1,17 = **−21,5**. "De reserves laten toenemen" geldt dus niet voor 2027.

### BELANGRIJK
**C3. Storting is een reservemutatie, geen uitgave.** De tegenbegroting kan het zo presenteren, maar volgens het BBV-overzicht van baten en lasten (art. 17 BBV) hoort de storting onder "toevoegingen aan reserves", na het "totaal saldo van baten en lasten". Advies: toon de storting als bestemming van het saldo, dus onder de streep, niet als uitgave.

**C4. Incidenteel en structureel (art. 19 BBV; notitie structurele en incidentele baten en lasten).**
- "Kettingeffect: subsidies afbouwen" (8,70 S) speelt alleen in 2027. Presenteer het als incidenteel, of toon cultuur netto als ingroei: 2,9 in 2027 en 11,6 vanaf 2028. Het is nu niet consistent, want de frictie staat wel als incidenteel. Het structurele saldo 2027 wordt bij herclassificatie 10,1 in plaats van 1,4. Dat is gunstig, maar moet consistent.
- De restkosten van de opvang (model: structureel −1,12) ontbreken. Als de eigen afbouwregel ook geldt voor diversiteit (1,19, "vooral subsidies"), duurzaamheidseducatie (1,4) en energiesubsidies (0,55), kost dat in 2027 −2,36. Het structurele saldo 2027 komt dan onder nul. Dan dekt eenmalig geld vaste lasten in 2027. Volgens het GTK 2020 is dat toelaatbaar als de laatste jaarschijf (2030) structureel sluit, wat zo is, maar de zin "Ook structureel houden we elk jaar geld over: 1,4 miljoen euro in 2027" klopt dan niet meer.

**C5. Frictiekosten en voorziening.** Bij een besluit tot een vertrekregeling moet in het jaar van het besluit een voorziening voor de volledige verplichting worden gevormd (art. 44 BBV). Het bedrag van 4,105 heeft geen onderbouwing (zie (e) en B2).

**C6. Taakstellingen niet ingevuld en invoering per 1-1-2027 (Gemeentewet art. 189 lid 2: structureel en reëel evenwicht; GTK 2020).**
- Overhead 20%, concernposten 40%, cultuur 40%, armoede 30%, IIT 30%, bijzondere bijstand 25% (open-einde-recht) en apparaat 20% gaan grotendeels al in 2027 in.
- Risico's:
  - meerjarige cultuurbeschikkingen (Cultuurnota; looptijd niet in het materiaal);
  - verordeningen (minima, IIT) die vóór 1-1-2027 gewijzigd moeten zijn;
  - arbeidscontracten van basisbanen;
  - ICT- en huisvestingscontracten in de overhead.
- Alleen cultuur en apparaat hebben ingroei.

**C7. Besparingen die mogelijk niet bestaan.** Energiebedrijf 0,201 (B4) en ongedocumenteerden 2028 5,0 (B3). Een besparing op een budget dat niet in de begroting 2027 staat, is geen besparing.

### KLEIN
- **C8.** De tabel "Uitgaven" bevat ook lagere baten (OZB, parkeren, reclame, toeristen, precario). Beter: "Lastenverlichting en investeringen".
- **C9.** Panden: alleen een boekwinst is een bate (ec_strategisch_bezit; boekwaarde onbekend).
- **C10.** Masterplan sport (2,0 per jaar): als het om investeringen gaat, activeren en kapitaallasten ramen. Nu staat het als exploitatiebudget.
- **C11.** FC Groningen (2,0 incidenteel): een bijdrage aan een commerciële derde is een last (activeren kan in de regel niet). Staatssteunregels toetsen; de-minimisgrens € 300.000.
- **C12.** Camera's: activeren en afschrijven is juist; de kapitaallasten dalen jaarlijks (zie U20).
- **C13.** Milieustraten (0,5) en veegkosten (2,08) uit algemene middelen in plaats van via de heffingen: dat mag, want kostendekkendheid is maximaal 100%. Benoem de keuze.
- **C14.** In de OZB-tarieven voor niet-woningen zit 6% opslag voor het Fonds Ondernemend Groningen (raadsvoorstel p. 2). Benoem of de bijdrage aan het Fonds meedaalt of op de gemeente drukt.
- **C15.** Oosterhamrikzone (SIF) en CDOKE: controleer de dekking. Bij dekking uit een bestemmingsreserve heeft schrappen geen saldo-effect. CDOKE is volgens de naam rijksgeld voor capaciteit; als het een decentralisatie-uitkering is, is het vrij besteedbaar (p. 35 en 45).

---

## (d) Meerjarige controle

### Reconstructie: de meerjarentabel is volledig herleidbaar
Met de rekenmotor van de game en de keuzes uit het document geldt het volgende (verschillen van 0,001 zijn afronding):

| Component | 2027 | 2028 | 2029 | 2030 | Toelichting |
|---|---|---|---|---|---|
| Ombuigingen S, vast deel (alle 2027-regels behalve 3 en 18) | 68,391 | 68,391 | 68,391 | 68,391 | geen ingroei |
| Apparaat 20% (rest) | 9,687 | 19,375 | 29,062 | 38,750 | 25/50/75/100% |
| Kettingeffect begeleiding naar werk | 0,482 | 1,125 | 1,607 | 1,607 | ingroei 30/70/100% |
| Kettingeffect overhead werkplaats valt vrij (kd_werkplaats) | 0 | 0,990 | 0,990 | 0,990 | **niet in de tabellen of de tekst** |
| Verplichte tegenprestatie (k_tegenprestatie) | 0 | 0,824 | 1,648 | 1,648 | **niet in de tabellen; tekst zonder bedrag** |
| **= Ombuigingen S** | 78,560 | 90,704 | 101,697 | 111,385 | document 78,56 / 90,705 / 101,698 / 111,386 |
| Ombuigingen I | 43,826 | 5,0 | 0 | 0 | 2028: ongedocumenteerden |
| Uitgaven S, vast deel (alle 2027-regels behalve U4) | 68,433 | 68,433 | 68,433 | 68,433 | camera's constant |
| Kettingeffect subsidies afbouwen | 8,700 | 0 | 0 | 0 | alleen 2027 |
| Kettingeffect cultuur en toeristenbelasting | 0 | 0,150 | 0,150 | 0,150 | **niet benoemd** |
| Kettingeffect gemeentefonds (minder bijstand) | 0 | 0,205 | 0,478 | 0,684 | **niet benoemd** |
| Kettingeffect preventie en jeugdzorg (voordeel) | 0 | −0,042 | −0,084 | −0,084 | **niet benoemd** |
| Onverklaard | 0 | 0,0675 | 0,0675 | 0,0675 | zie hieronder |
| **= Uitgaven S** | 77,133 | 68,814 | 69,045 | 69,250 | document 77,133 / 68,814 / 69,045 / 69,251 |
| "waarvan kettingeffecten" | −14,303 | −0,246 | 0,005 | −0,200 | document −14,303 / −0,246 / 0,005 / −0,201 |

- **Onverklaard (KLEIN, voorzichtig):** in 2028-2030 zit 0,0675 per jaar extra last in de uitgaven en in de kettingeffecten. Het bedrag is precies het kettingeffect "kaartverkoop schouwburg en toeristenbelasting" (kd_schouwburg) bij 50% bezuiniging op Stadsschouwburg en Oosterpoort (c1): −0,5 × 0,05 × 2,998 × 0,9 = −0,0675. Die bezuiniging staat niet in het document. Waarschijnlijk is het een restant uit een eerdere versie.
- **Werkplaats (BELANGRIJK, B10):** de code rekent 10% van alle o4-lasten (9,9), dus 0,99. De formule in `dwarsverbanden.json` is 10% van 0,9 (de werkplaats alleen), dus 0,09. Daarmee zijn de ombuigingen in 2028-2030 mogelijk 0,9 per jaar te hoog. Bovendien laat kd_bedrijfsafval juist 20% van dezelfde kosten doorlopen.

### Posten die anders lopen dan in 2027
- **Ingroei:** apparaat (25/50/75/100%), begeleiding naar werk (30/70/100%), tegenprestatie (0/50/100%), cultuur (25% in 2027).
- **Eenmalig:** WarmteStad, ongedocumenteerden (5,6 / 5,0), dierenartskosten (alleen 2027 meegeteld, budget loopt t/m 2030), Energiebedrijf, frictie, FC Groningen, storting.
- **Kettingeffecten met een eigen verloop:** subsidies (alleen 2027), werkplaats, gemeentefonds, toeristenbelasting en preventie (vanaf 2028).
- **Niet meegenomen:**
  - de eigen jeugdzorg-taakstelling van het college (2028-2030, "17,5 in 2030");
  - de eigen formatiereductie van het college;
  - wachtgeld van wethouders (2027-2029);
  - aanpassing van het BUIG-budget na enkele jaren;
  - indexatie en prijspeil. De paragraaf "zonder indexering" uit v2 is verdwenen; vermeld het prijspeil 2027 (KLEIN).
- Camera's: kapitaallasten constant 0,214; volgens het BBV 0,209 / 0,204 / 0,200 (verschil max. 0,014, KLEIN).

### Gecorrigeerde meerjarenbeelden

| | 2027 | 2028 | 2029 | 2030 | Cumulatief |
|---|---|---|---|---|---|
| Saldo document | 39,148 | 26,891 | 32,653 | 42,135 | 140,827 |
| − WarmteStad is geen bate (BBV) | −37,975 | | | | −37,975 |
| + rente minder lenen (2,5% × 37,975, game-kaart) | 0 | 0,949 | 0,949 | 0,949 | 2,848 |
| **= A. Na BBV-correctie** (overige aannames document) | **1,173** | 27,840 | 33,602 | 43,084 | **105,699** |
| − restkosten opvang (zp_ongedocumenteerden, 20% × 5,6) | −1,120 | −1,120 | −1,120 | −1,120 | −4,480 |
| − frictie volgens model (8,403 in plaats van 4,105) | −4,298 | | | | −4,298 |
| + parkeerelasticiteit (model, t5 gemiddeld −21,5%) | 1,836 | 1,836 | 1,836 | 1,836 | 7,346 |
| + onverklaarde 0,0675 eruit | | 0,067 | 0,067 | 0,067 | 0,202 |
| **= B. Volgens rekenmodel game** | **−2,409** | 28,623 | 34,385 | 43,867 | **104,466** |
| Te verifiëren: ongedocumenteerden 2028 bestaat niet | | −5,000 | | | −5,000 |
| Te verifiëren: Energiebedrijf bestaat niet | −0,201 | | | | −0,201 |
| Te verifiëren: werkplaats volgens formule in data (0,09) | | −0,900 | −0,900 | −0,900 | −2,700 |
| Ter vergelijking: mutatie eigen vermogen in de ontwerpbegroting (p. 353) | −22,690 | −4,302 | +1,732 | +4,403 | −20,857 |

- Lijn B is controleerbaar met het script (variant `model`). De motor geeft −2,448 / 23,584 / 34,346 / 43,828. Het verschil met de tabel komt van leefkwaliteit 0,20 tegen 0,16 en van de 5,0 in 2028, die niet in de data staat. De motor meldt voor 2027: "je eenmalige uitgaven zijn € 2,4 mln hoger dan je dekking".
- **Structureel saldo 2027:** document 1,427. Lijn B: 2,14 met het parkeereffect, 0,31 zonder. Met de afbouwregel op diversiteit, duurzaamheidseducatie en energiesubsidies wordt het negatief (B1).
- **Bandbreedte:**
  - verbetering ten opzichte van de ontwerpbegroting: ongeveer **89 tot 106** in plaats van 140,8. Bovenkant is lijn A. Onderkant is lijn B zonder het gunstige parkeereffect en met alle drie de te verifiëren posten: 104,5 − 7,3 − 5,0 − 0,2 − 2,7 = 89,2;
  - werkelijke groei van het eigen vermogen (min 20,9 interen in de ontwerpbegroting): ongeveer **68 tot 85**.

### Minimaal gecorrigeerde meerjarentabel (alleen de BBV-correctie)

| | 2027 | 2028 | 2029 | 2030 |
|---|---|---|---|---|
| Ombuigingen S (incl. rente WarmteStad vanaf 2028) | 78,560 | 91,654 | 102,647 | 112,335 |
| Ombuigingen I (zonder WarmteStad) | 5,851 | 5,0 | 0 | 0 |
| Uitgaven S | 77,133 | 68,814 | 69,045 | 69,251 |
| Uitgaven I (excl. storting) | 6,105 | 0 | 0 | 0 |
| Saldo | 1,173 | 27,840 | 33,602 | 43,084 |
| waarvan structureel | 1,427 | 22,840 | 33,602 | 43,084 |
| waarvan incidenteel | −0,254 | 5,0 | 0 | 0 |
| Cumulatief | 1,173 | 29,013 | 62,615 | 105,699 |

De verkoop van WarmteStad blijft als maatregel staan, buiten de exploitatie: "kasopbrengst ongeveer 38,0, gebruikt voor aflossing; levert vanaf 2028 ongeveer 0,95 per jaar rentevoordeel op".

---

## (e) Ontbrekende of afwijkende kettingeffecten

| Dwarsverband | Bij maatregel | Model 2027 / 2028 / 2029 / 2030 | Document | Oordeel |
|---|---|---|---|---|
| zp_ongedocumenteerden (restkosten) | stoppen opvang | −1,12 per jaar (aandeel_restkosten 0,2, "te onderzoeken") | ontbreekt | **ONTBREEKT (B3).** Minimaal −1,12 in 2027, en −1,0 in 2028 als de 5,0 bestaat. |
| org_frictie | overhead −20% | −8,40 incidenteel in 2027 (verloop 5% × 357,948 = 17,90 per jaar) | −4,105 ("vrijwillige vertrekregeling") | **AFWIJKEND (B2).** Consequent toegepast op overhead, CDOKE en de rest van de 20% (42,5 in 2027 tegen 17,9 verloop): 24,6 / 16,4 / 8,2 = 49,3. Alleen het personele deel van de overhead (16,4): 14,7 / 6,5 / 0 = 21,2. Het college gebruikt voor zijn eigen 10% (21,75 in 2030) ook het verloop. En de vacaturestop zondert uitvoering en handhaving uit, waardoor er minder verloop beschikbaar is. |
| WarmteStad-kaart | verkoop 49% | bate 0; +0,95 per jaar rente vanaf 2028 | +37,975 bate | **AFWIJKEND = FOUT (K1).** |
| jur_subsidies | cultuur −40% | −8,70 / 0 / 0 / 0 | −8,70 (S) | Gelijk; hoort incidenteel (B1). |
| jur_subsidies (eigen logica) | diversiteit, duurzaamheidseducatie, energiesubsidies | zitten niet in de lijst van het model | – | **Inconsistent (B1):** tot −2,36 in 2027. |
| wia_basisbanen | basisbanen −100% | "nog niet doorgerekend": aantal deelnemers ontbreekt; terugval 60% | ontbreekt | **ONTBREEKT (B8):** ongeveer 1,0 per jaar per 100 deelnemers (aantal staat in deelprogramma 3.1, p. 86-90). |
| org_wethouders | college −25% | "nog niet doorgerekend" (wachtgeld) | aanname "geen wachtgeld" | **ONTBREEKT (B9):** wachtgeld is een recht (Appa); alleen verrekening met nieuw inkomen. |
| wia_tegenprestatie | tegenprestatie | wacht op schuif; "kost eerst geld" | 0 / 0,82 / 1,65 / 1,65 netto (game-kaart), zonder startkosten | Afwijkend (KLEIN): uitvoeringskosten (volgens de kaart 4,5 bruto per jaar) gaan vóór de besparing. |
| kd_werkplaats | zakelijke dienstverlening −100% | 0 / +0,99 per jaar | in de meerjarentabel, niet zichtbaar | Formule in data geeft 0,09 (B10). |
| kd_bedrijfsafval | zakelijke dienstverlening −100% | −1,98 per jaar | −1,98 | Gelijk (parameter "te onderzoeken"). |
| wia_reintegratie | coaching +10% | +0,48 / 1,12 / 1,61 / 1,61 | gelijk | Klopt; gem_uitkering is "te onderzoeken"; het BUIG-budget past zich na enkele jaren aan (niet gemodelleerd). |
| rijk_verdeelmodel | minder bijstand | 0 / −0,21 / −0,48 / −0,68 | verwerkt, niet benoemd | Klopt; transparantie (B10). |
| ec_toerisme_cultuur | cultuur −40% | 0 / −0,15 per jaar | verwerkt, niet benoemd | Klopt. |
| zp_preventie_jeugd | jeugd en veiligheid +10% | 0 / +0,04 / +0,08 / +0,08 | verwerkt, niet benoemd | Klopt. |
| kd_schouwburg | c1 (niet gekozen) | – | vermoedelijk −0,0675 per jaar | Waarschijnlijk restant (KLEIN). |
| ec_parkeren_elasticiteit | parkeren −13,9 / −22,2 / −22,8% | +1,84 per jaar | ontbreekt | Ontbreekt (KLEIN; voorzichtig; de tekst claimt het effect wel). |
| fin_rente | stortingen | 2,5% over het gestorte bedrag, vanaf het jaar erna | ontbreekt | Ontbreekt (KLEIN; voorzichtig). Na de correctie: ongeveer 0,03 / 0,72 / 1,57 in 2028-2030. |
| org_capaciteit | overhead −20% | tempo bouwen, vergunningen en investeringen −10% (geen bedrag) | niet benoemd | KLEIN. |
| ec_strategisch_bezit, en_warmtestad | panden, WarmteStad | "nog niet doorgerekend" (boekwaarde, dividend) | PM / – | KLEIN. |
| vh_boetes_rijk, rijk_ozb_rekentarief | boa's, OZB | geen boete-inkomsten; OZB-verlaging volledig eigen kosten | geen boetes geclaimd; OZB volledig | Klopt. |

De bronregel "berekeningen VVD Groningen, inclusief kettingeffecten" dekt dus niet alles. Een deel staat er niet in, een deel is niet zichtbaar, en het belangrijkste (WarmteStad) wijkt af van het model.

---

## (f) Bedragen in de lopende tekst en op de omslagen

| Plek | Bedrag in tekst | Controle | Oordeel |
|---|---|---|---|
| Apparaat | 71,6 per jaar vanaf 2030 | 20% × 357,948 = 71,59; tabel 2030: 26,3 + 6,54 + 38,75 | Klopt. |
| Apparaat | college: 10%, oplopend tot 21,75 in 2030 | niet in het materiaal; 10% van de loonsom = 35,8 | **Niet controleerbaar, intern niet consistent (B14).** Nodig: financiële begroting/personeel (p. 355 e.v.). |
| Apparaat | 14,7 fte per 1.000 (2025); 12,3 (2022) | apparaat-2027.json (p. 283) | Klopt. |
| Strategisch bezit | 11,7 / 9,3 / netto 2,4 | e7 (p. 23) | Klopt. |
| WarmteStad | "36,5 eigen vermogen geïnvesteerd" | niet in het officiële materiaal; volgens OOG (okt. 2026) een extra kapitaalverstrekking door de gemeente | Niet controleerbaar; "zij" is dubbelzinnig (p. 247). |
| WarmteStad | boekwaarde 77,5 (p. 247); ongeveer 38 | speldata; 49% × 77,5 = 37,975 | Rekenkundig juist; **"storten we in de reserves" onjuist (K1).** |
| Wethouders | twee wethouders, 25% | 2 van 8; g1 inclusief burgemeester | ≈ 21% (0,51); wachtgeld (B9). |
| Diversiteit | 1,4 | z10 | Klopt. |
| Overige | 0,1 / 0,05 in 2027 / 0,2 in 2027 | kaarten | 0,1 en 0,05 kloppen; **0,2 Energiebedrijf twijfelachtig (B4).** |
| IIT | 4,2; referteperiode 2 of 3 jaar | s12 | 4,2 klopt; de referteperiode-claims zijn niet controleerbaar. |
| Ongedocumenteerden | 5,6 in 2027; 5,0 in 2028 | 5,6 op p. 122 | **2028 niet in de data (B3).** |
| Cultuur | Forum 10,9 subsidie; "2025 voor het eerst positief" | niet in het materiaal; c2 bevat volgens de data alleen cultuurnota-instellingen; het Forum-gebouw staat in c5 | Niet controleerbaar (p. 139). Mogelijk valt het Forum niet onder de taakstelling op c2. |
| Cultuur | 2027 een kwart | 11,6 − 8,7 = 2,9 | Klopt. |
| Oosterhamrikzone | 0,25 per jaar | m9 | Klopt (dekking SIF verifiëren). |
| Mobiliteit | 55%; 1,4 per jaar | 1,56 × 55%; 5,57 × 25% = 1,39 | Klopt. |
| OZB | +4,58% en +5%; afval +9,81%; riool +8,11%; woonlasten +9,57% | raadsvoorstel p. 2-3 | Klopt. |
| OZB | 12,8 (huiseigenaren) en 12,4 (bedrijfspanden) | Iv3 0.61 70,76 × 18,04% = 12,77; 0.62 68,68 × 18,04% = 12,39 | Klopt met de gekozen methode. Bij exact −10% t.o.v. 2026 volgens de tarieven: 12,5 en 11,2 (B5). |
| Reclame | 0,98 (2027) | kerngegevens | Klopt. |
| Parkeren | "uurtarief binnenstad sinds 2020 verdubbeld" | 2026: € 5,00; tarief 2020 niet in het materiaal | Niet controleerbaar. |
| Parkeren | +20% kortparkeren in 4 gebieden | raadsvoorstel p. 6 (inclusief indexatie) | Klopt. |
| Toeristenbelasting | 4,65 naar 4,19 | 4,65 × 0,9 = 4,185 | Klopt. |
| Afval en riool | "alle veegkosten"; ongeveer € 16 per huishouden; 2,08 | 2,08 / 127.816 woningen = € 16,3 | Intern consistent. 2,08 niet controleerbaar (B13). "Alle" staat niet in het raadsvoorstel. |
| Milieustraten | 0,5 | tabel | Klopt. |
| Jeugdzorg | taakstelling oplopend tot 17,5 in 2030 | niet in het materiaal | **Niet controleerbaar; inconsistent met "realistisch begroten" (B11).** |
| Jeugdzorg | 12,6 per jaar | 10% × 125,9 | Klopt. |
| Coaching | 2,4 per jaar | 10% × 23,8 | Klopt. |
| Sport en FC | 2 per jaar / eenmalig 2 | tabel | Klopt. |
| Financiële positie | 39,1 (2027) | tabel | Rekenkundig klopt; **na BBV-correctie 1,2 (K1).** |
| Financiële positie | 42,1 in 2030 | tabel | Klopt als verschil met de ontwerpbegroting; die heeft zelf −10,1 in 2030. |
| Financiële positie | 140,8 over 2027-2030 | tabel | Rekenkundig klopt; **inhoudelijk onjuist (K3).** |
| Realistisch begroten | 1,4 structureel in 2027 | 78,56 − 77,133 = 1,427 | Klopt, maar de cel in de tabel is kapot (K2) en het bedrag is kwetsbaar (B1). |
| Risico's | 25% van risico's (bandbreedte 34-139); 25% van Gemeentefonds 43,5; samen +32,5 | 25% × (34 + 139)/2 + 25% × 43,5 = 21,625 + 10,875 = 32,5 | Klopt **alleen met het midden van de bandbreedte**; dat staat niet in de tekst (onderkant 19,4, bovenkant 45,6). Bedragen niet controleerbaar (p. 193-197). |
| Enexis | 50; 72,5% naar 50%; −15,5 | 50/0,725 × 0,225 = 15,5. Speldata: 50 is de stille reserve boven de boekwaarde, en dan 50 × 0,225 = 11,25 | **Inconsistent of te verifiëren (B7)** (p. 195). |
| Weerstandsvermogen | 111% tegen 152% | 152% kerngegevens klopt. 111% vereist beschikbaar ongeveer 191,2 en benodigd ongeveer 125,8. Met −11,25: 114%. Met alleen de algemene reserve als capaciteit, zoals de game: 79% | 152 klopt; **111 niet controleerbaar.** |
| Omslag 01 | € 122,4 mln aan ombuigingen en opbrengsten 2027 | tabel | Rekenkundig klopt; bevat 38,0 die geen bate is (84,4 na correctie). |
| Omslag 02 | 10% minder OZB | ten opzichte van 2026 | Klopt met de tekst; ten opzichte van het collegevoorstel is het ongeveer 18% (of 17,7% bij exact −10%). |
| Omslag 03 | 111% reëel weerstandsvermogen | zie boven | Niet controleerbaar. |
| Omslag 04 | € 140,8 mln cumulatief 2027-2030, naar de reserves | zie K3 | **Onjuist.** |

---

## Wat uit het boekwerk nodig is om de open punten te sluiten
| Punt | Pagina of paragraaf |
|---|---|
| Ongedocumenteerden 2028 (5,0); Energiebedrijf 2027; Campus Camera 2027; dierenartskosten 2028-2030 | p. 122 (deelprogramma 3.3) en het intensiveringenoverzicht p. 297-299 (toelichting p. 305-317) |
| Weerstandscapaciteit en benodigde capaciteit, bandbreedte 34-139, Gemeentefonds 43,5, Enexis 50 en 72,5% | paragraaf weerstandsvermogen p. 193-197 (Enexis p. 195) |
| WarmteStad: boekwaarde, kapitaalverstrekking 36,5, leningen en garanties, Wcw | verbonden partijen p. 247 |
| OZB per categorie, kostendekkendheid afval en riool (veegkosten 2,08) | paragraaf lokale heffingen p. 275 e.v. |
| Kortparkeren per gebied, parkeergarages, vergunningen | deelprogramma 1.2 p. 35 en tarievenbijlage raadsvoorstel |
| Aantal basisbanen en bijstandsuitkeringen, gemiddelde uitkering | deelprogramma 3.1 p. 86-91 |
| Jeugdzorg-taakstelling 2028-2030 (17,5) | deelprogramma 3.3 p. 120 en meerjarenbeeld / financiële begroting |
| Formatiereductie college (10%, 21,75) | personeelskosten p. 355 en inleiding / financieel meerjarenbeeld |
| Forum-subsidie (10,9) en de post waarin die staat | deelprogramma 3.5 p. 139 |
| SIF (Oosterhamrikzone), concernposten, college B&W | p. 35, staat van reserves, p. 151 |

## Concrete correcties vóór indienen
1. WarmteStad uit de exploitatie halen. Opnemen als balansmaatregel met rentevoordeel (+0,95 per jaar vanaf 2028). Storting 2027, cumulatief, tekst en omslagen 01 en 04 aanpassen.
2. Cel "−0,331,427" vervangen door "1,427". Inhoudsbesturingselementen en Arial Unicode MS verwijderen.
3. "Reserves groeien met …" herformuleren als "… beter dan de ontwerpbegroting". De eigen tekorten van de ontwerpbegroting in 2029-2030 noemen.
4. Ongedocumenteerden 2028 en Energiebedrijf verifiëren of schrappen. Restkosten opvang opnemen.
5. Frictiekosten onderbouwen, of de personeelsbesparing in 2027-2029 laten ingroeien binnen het natuurlijk verloop.
6. OZB: of het bedrag naar ongeveer 23,7 (12,5 en 11,2), of de claim naar "ruim 10%". Tarieven vermelden.
7. Garages en kortparkeren: de aangenomen tariefstijging 2027 vermelden, of rekenen met +4,58%.
8. De posten die alleen in de meerjarentabel staan (tegenprestatie, werkplaats, gemeentefonds, toeristenbelasting, preventie) in een toelichting zetten. De onverklaarde 0,0675 verwijderen.
9. Weerstandsvermogen: vermelden dat het midden van de bandbreedte is gebruikt en hoe de Enexis-weging is bepaald. Capaciteit en risico's in bedragen noemen.
10. Kettingeffect subsidies als incidenteel presenteren. De afbouwregel ook toepassen op diversiteit en duurzaamheidseducatie, of uitleggen waarom niet.
