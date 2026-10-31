# Controle tegenbegroting 2027 VVD Groningen (v1 → v2)

Peildatum: 31 oktober 2026. Bron van waarheid voor de cijfers: het rekenmodel van de Begrotingsgame (`src/engine`, data `data/begroting-2027.json`, scenario _midden_).

## 0. Vooraf: wat ik wel en niet had

- **Aangeleverd was alleen** `Tegenbegroting_VVD_Groningen_2027.docx`. De map `tegenbegroting/` met het 2026-docx, de xlsx en Rik.pdf/Fokke.pdf/Jasper.pdf/Teun.pdf **ontbrak**. Gevolgen:
  - **Riks invoer** voor alles buiten de fractielijn heb ik gereconstrueerd uit de percentages en kaarten in het v1-docx. Elk bedrag daarvan komt tot op de afronding overeen met de game, dus de reconstructie is consistent. Maar ik heb hem niet tegen Rik.pdf kunnen leggen. **[CONTROLEREN]**
  - **Mijn bedrag** in de verschillenlijst is overgenomen uit de tabellen van v1, niet uit jouw xlsx. Het nieuwe xlsx-bestand is daarom opnieuw opgebouwd met dezelfde vier tabbladen, niet "bijgewerkt".
  - **De layoutvergelijking** is gedaan tegen de PDF-weergave van v1. Die heeft dezelfde huisstijl als 2026, maar het 2026-bestand zelf had ik niet.
- **Webtoegang was beperkt.** De sessie kon coelo.nl, wetten.overheid.nl, cbs.nl, rtvnoord.nl, oogtv.nl, nos.nl, rijksoverheid.nl en lokaleregelgeving.overheid.nl niet openen. Bronnen komen daarom uit zoekresultaten (titel, URL en fragment), behalve COELO: dat databestand staat al in de repo (`data/woonlasten-2026.json`, opgehaald 1-10-2026). **Open elke URL in de voetnoten één keer zelf** voordat het document de deur uitgaat. Wil je dat ik het naloop, laat die domeinen dan toe in de netwerkinstellingen van de omgeving (Network access → Allowed domains).
- **Fractienamen.** In je opdracht noem je Rik, Fokke, Cassandra en Lisa. Het docx (pagina Fractie) en de PDF-namen noemen Rik Heiner, Fokke Veenstra, Jasper van der Aa en Teun Havinga. Ik heb de namen niet gewijzigd. **[CONTROLEREN]**

### Invoer in de game (fractielijn + Rik)

Het bestand `controle/keuzes.ts` bevat de exacte invoer.

- **Schuiven fractielijn:**
  - h1 −20, o1 +20
  - c2 −40, c1 −40, c3 −10
  - z4 −20, z1 +10, z3 −15, z2 0
  - s10 −40, s6 −100, s3 +10
  - w12 −60, v2 +10, k1 +5
  - OZB −20
  - Parkeren −20 op alle 10 parkeerposten: kortparkeren, garages en 8 soorten vergunningen
  - Kaart `k_apparaat_15`
- **Schuiven van Rik (uit v1):**
  - Ombuigingen: g7 −40, g5 −30, e9 −25, e7 −35, g1 −24, o4 −100, z10 −85, z8 −25, z9 −45, g4 −30, s12 −75, s11 −25, z6 −20, z11 −16,7, c5 −25, m9 −100, w7 −40, w6 −55, d6 −100, m11 −40, m4 −55, o8 −15, w4 −25, m2 −20
  - Investeringen: v3 +10, e8 +10, e10 +5, e3 +15, b1 +5, v5 +10, b2 +5, o6 +5, v4 +10, w10 +5, w1 +5, k2 +5, e6 +5
  - Belastingen: toeristenbelasting −10, precario −60,7, reclame −100
- **Kaarten:** p_energiebedrijf, p_diversiteit_organisatie, k_minder_bouwregels, p_emissieloos_wagenpark, p_campus_camera, p_internationale_solidariteit, k_dierenarts, k_tegenprestatie, k_ongedoc, p_niemeyer, k_smr_onderzoek
- **Programma's stopgezet:** p_preventiefonds_jeugd, p_werkprogramma, p_route_arbeid_plus (zie a.2)
- **Grenzen:** de game hoefde niets te corrigeren; alle keuzes vallen binnen de grenzen.

---

## (a) Verschillenlijst cijfers: mijn model (v1, lineair) vs game

### a.1 Totalen

|                                   | Mijn model (v1) |      Game (v2) |    Verschil |
| --------------------------------- | --------------: | -------------: | ----------: |
| Ombuigingen en opbrengsten 2027   |         130,617 |        138,212 |      +7,595 |
| Uitgaven 2027 (excl. storting)    |          79,142 |        114,244 |     +35,102 |
| **Saldo 2027 = storting reserve** |      **51,475** |     **23,968** | **−27,507** |
| waarvan structureel / incidenteel |  51,128 / 0,347 | 23,201 / 0,767 |             |
| Saldo 2028                        |          65,083 |         59,762 |      −5,321 |
| Saldo 2029                        |          79,039 |         74,255 |      −4,784 |
| Saldo 2030                        |          92,995 |         87,502 |      −5,493 |
| Cumulatief 2027-2030              |         288,592 |        245,488 |     −43,104 |

De game-saldo's per jaar (S/I) komen tot op de duizend euro overeen met `bereken()`; het script controleert dat (assert).

### a.2 Verschillen per post (2027, x € 1 mln; + = gunstig voor het saldo)

| Post                                                                                                                     |                                          Mijn bedrag |                                                           Game | Oorzaak                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------: | -------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Preventiefonds jeugd**                                                                                                 |                                     −4,509 (uitgave) |                                      **+4,509 (ombuiging, I)** | In de game is `p_preventiefonds_jeugd` "Stoppen met het preventiefonds jeugd": een eenmalig programma in post z1 dat je stopzet. v1 boekte het als nieuwe uitgave. Effect: +9,018. |
| **Werkprogramma**                                                                                                        |                                                −1,05 |                                                  **+1,05 (I)** | `p_werkprogramma` = "Stoppen met het werkprogramma bijstand" (in s3). Effect: +2,1.                                                                                                |
| **Route Arbeid+**                                                                                                        |                                                −0,35 |                                                  **+0,35 (I)** | `p_route_arbeid_plus` = "Route Arbeid+ niet uitbreiden" (in s3). Effect: +0,7.                                                                                                     |
| Verplichte tegenprestatie                                                                                                |                              0 · 0,533 · 1,067 · 1,6 |                                      0 · 0,824 · 1,648 · 1,648 | Fasering in de game 0/50/100/100% (ingroeipad), niet lineair.                                                                                                                      |
| Ambtenarenapparaat 15%                                                                                                   |                                      13,423 → 53,692 |                                                         gelijk | 25/50/75/100% was al juist. De game rekent daarnaast **eenmalig 10,948 frictiekosten** (kettingeffect org_frictie).                                                                |
| Welzijnsinstellingen 25%                                                                                                 |                                                2,125 |                                                          2,114 | Basis netto 8,454 (8,7 − 0,246 baten); v1 gebruikte 8,5.                                                                                                                           |
| Wijkvernieuwing 30%                                                                                                      |                                                 1,86 |                                                          1,845 | Basis 6,15 (v1: 6,2).                                                                                                                                                              |
| Bijzondere bijstand 25%                                                                                                  |                                                 1,35 |                                                           1,36 | Basis netto 5,44 (v1: 5,4).                                                                                                                                                        |
| Uitvoering mobiliteitsvisie 55%                                                                                          |                                                 0,88 |                                                          0,858 | Basis 1,56 (v1: 1,6).                                                                                                                                                              |
| Oosterhamrikzone 100%                                                                                                    |                                                  0,3 |                                                           0,25 | Basis 0,25 (v1: 0,3).                                                                                                                                                              |
| Precariobelasting −60,7%                                                                                                 |                                                1,153 |                                                          1,133 | Opbrengst 1,866 volgens Ontwerpbegroting 2027 (v1: 1,9).                                                                                                                           |
| Reclamebelasting −100%                                                                                                   |                                                  1,0 |                                                           0,98 | Opbrengst 0,98.                                                                                                                                                                    |
| Citymarketing 15%                                                                                                        |                                                0,345 |                                                          0,338 | Basis 2,25 (v1: 2,3).                                                                                                                                                              |
| OZB, kortparkeren, garages, vergunningen, toeristenbelasting, extra geld wonen, bedrijventerreinen, opvang vluchtelingen | 27,88 / 4,72 / 1,76 / 0,78 / 0,3 / 0,09 / 0,08 / 0,2 | 27,888 / 4,727 / 1,755 / 0,778 / 0,300 / 0,089 / 0,078 / 0,200 | Alleen afronding.                                                                                                                                                                  |

**Kettingeffecten (nieuwe regels, ontbraken in v1)**, 2027 · 2028 · 2029 · 2030:

| Kettingeffect (game-id)                                        | Bedragen                          | Wat                                                            |
| -------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| Subsidies afbouwen kost tijd (jur_subsidies)                   | −13,431 · 0 · 0 · 0               | Bij c2, c3, z8 en z9 telt in 2027 maar 25% van de besparing.   |
| Lopende Wmo-contracten (jur_contracten)                        | −10,32 · 0 · 0 · 0                | De Wmo-besparing gaat pas in 2028 in.                          |
| Frictiekosten minder ambtenaren (org_frictie)                  | −10,948 (I) · 0 · 0 · 0           |                                                                |
| Gemeenschappelijke regelingen (jur_gr)                         | −2,675 · −2,675 · 0 · 0           | GGD en Regio Groningen-Assen: de besparing komt pas na 2 jaar. |
| Bedrijfsafval (kd_bedrijfsafval)                               | −1,98 per jaar                    | De marge valt weg en de vaste kosten lopen door.               |
| Restkosten ongedocumenteerden (zp_ongedocumenteerden)          | −1,12 per jaar                    |                                                                |
| Parkeercontrole (vh_parkeerhandhaving)                         | −0,581 per jaar                   | Minder naheffingen en minder mensen die betalen.               |
| Lager parkeertarief trekt bezoekers (ec_parkeren_elasticiteit) | +1,742 per jaar                   |                                                                |
| Re-integratie (wia_reintegratie)                               | +0,482 · +1,125 · +1,607 · +1,607 |                                                                |
| Overhead werkplaats valt vrij (kd_werkplaats)                  | 0 · +0,99 · +0,99 · +0,99         |                                                                |
| Preventie en jeugdzorg (zp_preventie_jeugd)                    | 0 · −2,13 · −4,26 · −4,26         |                                                                |
| Welzijn en Wmo (zp_preventie_wmo)                              | 0 · −0,522 · −1,044 · −1,044      |                                                                |
| Gemeentefonds (rijk_verdeelmodel)                              | 0 · −0,205 · −0,478 · −0,656      |                                                                |
| Toeristenbelasting cultuur (ec_toerisme_cultuur)               | 0 · −0,159 · −0,159 · −0,159      |                                                                |
| Toeristenbelasting schouwburg (kd_schouwburg)                  | 0 · −0,054 · −0,054 · −0,054      |                                                                |
| Woningbouw OZB (wg_woningbouw)                                 | 0 · 0 · +0,014 · +0,029           |                                                                |
| Areaal openbare ruimte (or_areaal)                             | 0 · 0 · 0 · −0,013                |                                                                |

- **S/I-indeling.** Overgenomen zoals de game hem geeft. Let op: jur_subsidies, jur_contracten en jur_gr heten in de game "structureel", maar ze zijn tijdelijk (alleen 2027 of 2027-2028).
- **Afronding.** De regels zijn op drie decimalen afgerond en de totalen komen exact uit de game. Daardoor kan de som van de regels 0,001 tot 0,003 afwijken van het totaal; dat staat ook in de tekst.

### a.3 Aandachtspunten in de game-data **[CONTROLEREN]**

- **Programma's met bedragen uit 2026.** Volgens de bronvelden in `data/begroting-2027.json` komen enkele programma's en kaarten uit de _begroting 2026_:
  - Preventiefonds jeugd: 4,509 was het laatste jaar 2026.
  - Werkprogramma: 1,05 in 2026, daarna 0,85 per jaar.
  - Energiebedrijf: 0,201 in 2026.
  - Niemeyer: 0,25.
  - Wegenfundering WarmteStad (0,45): op verzoek van de fractie geschrapt, omdat dit uit de begroting 2026 komt en al heeft plaatsgevonden. Energiebedrijf, Niemeyer en de drie programma's staan er nog in; vermoedelijk geldt voor een deel daarvan hetzelfde.

  Of deze bedragen in de Ontwerpbegroting 2027 nog zo bestaan, staat niet vast. Volgens `data/WIJZIGINGEN-2027.md` moeten de programma's nog worden nagelopen. Ik heb de game gevolgd, want die is de bron van waarheid, maar dit kan het saldo met enkele miljoenen veranderen.

- **Niet doorgerekend.** Deze kettingeffecten staan in de game op "nog niet doorgerekend" en zitten dus niet in de cijfers:
  - Basisbanen: mensen die terugvallen in de bijstand (wia_basisbanen).
  - Armoedeval (wia_armoedeval).
  - Wachtgeld wethouders (org_wethouders): het college zit er tot 2030, dus minder wethouders in 2027 vraagt dat er wethouders tussentijds vertrekken, met wachtgeld. **Fractiekeuze (toegevoegd na overleg):** de tekst gaat ervan uit dat vertrekkende wethouders direct een nieuwe baan hebben en afzien van wachtgeld, zodat de besparing van 0,576 mln al in 2027 volledig telt. Dat is ook hoe de game rekent. Let op: dit is een aanname. Wachtgeld is een wettelijk recht van de wethouder (Appa); inkomsten uit een nieuwe baan worden er wel op gekort, maar afzien is een eigen keuze van de wethouder zelf. Vinden ze niet direct werk, dan kost dit geld.

---

## (b) Externe uitspraken: oude formulering, bron, nieuwe formulering

Alle bronnen staan als echte Word-voetnoot in v2, in Lucida Sans Unicode, 8 pt. Onder de tabel staat een korte bronregel.

| #   | Oude formulering                                                                                                            | Gevonden bron (uitgever, jaar/peildatum, URL)                                                                                                                                                                                                    | Wat de bron zegt                                                                                                                                                                                                                                                                                                                                                                                | Nieuwe formulering                                                                                                                                                                                                                 | Status                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Groningers betalen de hoogste OZB in het Noorden." (intro Lagere lasten)                                                   | COELO (RUG), _Atlas van de lokale lasten 2026_, databestand Gemeentelijke belastingen 2026 (tarieven 2026). https://coelo.nl/atlas-lokale-lasten-2026/bijlagen-2026-en-databestanden/ (in de repo: `data/woonlasten-2026.json`)                  | Gemiddeld betaalde OZB bij de gemiddelde WOZ-waarde: Groningen € 687, de hoogste van de 65 gemeenten in Groningen, Drenthe, Fryslân en Overijssel. Daarna volgen Borne (€ 646) en Midden-Groningen (€ 618). Landelijk staat Groningen op plaats 24 van 342.                                                                                                                                     | "Groninger huiseigenaren betalen gemiddeld de hoogste OZB van het Noorden."                                                                                                                                                        | Klopt, mits het gaat over het bedrag dat een huiseigenaar betaalt (niet over het tarief).                                       |
| 2   | "Er is geen gemeente in Groningen, Drenthe, Friesland en Overijssel met een OZB zo hoog als …"                              | Zelfde bron.                                                                                                                                                                                                                                     | Zie 1.                                                                                                                                                                                                                                                                                                                                                                                          | "…waar een huiseigenaar gemiddeld zoveel OZB betaalt als in de gemeente Groningen."                                                                                                                                                | Klopt.                                                                                                                          |
| 3   | "De parkeertarieven in Groningen behoren tot de hoogste van Nederland."                                                     | ANP, "Van plek 10 naar plek 4: Haarlem bij duurste parkeersteden van Nederland", 20-10-2026, https://persportaal.anp.nl/artikel/230ac0d2-e22e-403c-ab54-2966cc6d7f61                                                                             | Groningen € 5,00 per uur in de binnenstad, +100% sinds 2020, na Haarlem (+106%) de grootste stijging van de 30 grootste gemeenten. Groningen staat niet in de top 5: Amsterdam € 8,05, Utrecht € 8,01, Den Haag, Haarlem en Rotterdam staan hoger. Extra: CBS 83642NED geeft € 155 per inwoner parkeerheffingen tegen landelijk ca. € 88. Dat cijfer heb ik niet geverifieerd en niet gebruikt. | "Parkeren in Groningen is de afgelopen jaren fors duurder geworden: het uurtarief in de binnenstad is sinds 2020 verdubbeld, na Haarlem de grootste stijging van de dertig grootste gemeenten van Nederland."                      | De oude claim klopt deels. Nieuwe tekst: [CONTROLEREN], want het ANP-artikel kwam uit een zoekfragment.                         |
| 4   | Precariobelasting "torenhoog"                                                                                               | Geen recente onafhankelijke vergelijking gevonden. De enige landelijke vergelijking (Afvalcontainershop.nl 2018, via Binnenlands Bestuur) noemt de provincie Groningen juist de goedkoopste.                                                     |                                                                                                                                                                                                                                                                                                                                                                                                 | Neutraal: precario op containers en steigers maakt noodzakelijk onderhoud duurder en geeft extra administratie. Zonder vergelijking en zonder voetnoot.                                                                            | Claim geschrapt.                                                                                                                |
| 5   | Reclamebelasting: "De uitvoeringskosten van deze belasting zijn erg hoog."                                                  | Geen onafhankelijke bron gevonden. Er zijn alleen gemeentelijke stukken (Woo-kostenbatenanalyse, evaluatie 2025) en NBK-begroting.                                                                                                               |                                                                                                                                                                                                                                                                                                                                                                                                 | "De belasting levert de gemeente weinig op (1,0 miljoen euro per jaar), terwijl inventarisatie, controle en bezwaar tijd en geld kosten…" (opbrengst uit de eigen begroting).                                                      | Claim afgezwakt.                                                                                                                |
| 6   | "In het Forum wordt op weinig verdiepingen echt geld verdiend."                                                             | OOG, "Forum Groningen krijgt extra jaar voor stabiele exploitatie", mei 2025, https://www.oogtv.nl/2025/05/forum-groningen-krijgt-extra-jaar-voor-stabiele-exploitatie-geld-naar-onderhoud-en-upgrade-bieb/ ; RTV Noord 2023 (tekort > € 1 mln)  | De oude zin is een citaat van een raadslid in RTV Noord (2023), dus een mening. Feitelijk: tekorten in 2023 en 2024, aanloopperiode verlengd tot en met 2026.                                                                                                                                                                                                                                   | "Zo is het Forum nog altijd niet financieel zelfstandig: na tekorten in 2023 en 2024 is de aanloopperiode verlengd tot en met 2026."                                                                                               | [CONTROLEREN]: OOG-pagina niet zelf geopend. Kijk ook of er al cijfers over 2025 zijn.                                          |
| 7   | Warmtestad: "…aangezien dit bij een commercieel bedrijf ook niet zou gebeuren."                                             | OOG, sep 2025 (WarmteStad sinds 2025 volledig van de gemeente).                                                                                                                                                                                  | De vergelijking met een commercieel bedrijf klopte niet.                                                                                                                                                                                                                                                                                                                                        | **Alinea en tabelregel vervallen** op verzoek van de fractie: de post komt uit de begroting 2026 en het verwijderen van de fundering heeft al plaatsgevonden.                                                                      | Vervallen.                                                                                                                      |
| 8   | Inkomenstoeslag: oude tabel (2026) en "net als veel andere gemeenten de toekenning niet van 2 jaar te wijzigen naar 3 jaar" | Verordeningen IIT op lokaleregelgeving.overheid.nl en de informatiepagina's van de gemeenten (2026); Participatiewet art. 8 en 36 (https://wetten.overheid.nl/BWBR0015703). Zie de tabel hieronder.                                              | De gemeente bepaalt zelf wat "langdurig" is. Groningen hanteert 24 maanden (verordening 2015, CVDR367471). De meeste vergelijkbare gemeenten hanteren 3 jaar of langer; alleen Rotterdam is korter (1 jaar). De bedragen van Groningen liggen hoger dan die van de G4, maar op het niveau van Tilburg, Maastricht, Leeuwarden en onder Eindhoven.                                               | Nieuwe tabel. De zin is herschreven: "…De VVD stelt voor om net als die gemeenten de termijn te verlengen van twee naar drie jaar." De vergelijking is: "ruimer dan de vier grote steden" (was: "fors meer dan andere gemeenten"). | **Politiek punt:** de oude zin was onduidelijk ("niet"). Ik heb hem gelezen als verlengen naar 3 jaar. Klopt dat? [CONTROLEREN] |
| 9   | "Het kabinet heeft besloten om niet langer geld beschikbaar te stellen voor uitgeprocedeerde asielzoekers."                 | NOS, "Faber schrapt financiering 'bed-bad-brood'…", 4-9-2024, https://nos.nl/l/2535822 ; Kamerbrief 18-12-2024                                                                                                                                   | Het kabinet-Schoof stopte de rijksbijdrage aan de LVV per 1-1-2025. Of het kabinet-Jetten dit heeft hersteld, is niet gevonden.                                                                                                                                                                                                                                                                 | "Het vorige kabinet heeft besloten om met ingang van 2025 niet langer geld beschikbaar te stellen voor de opvang van uitgeprocedeerde asielzoekers."                                                                               | [CONTROLEREN]: coalitieakkoord en Rijksbegroting 2027 op een eventuele LVV-post.                                                |
| 10  | "…vertrouwen dat het nieuwe kabinet hiermee aan de slag gaat"                                                               | Rijksoverheid, "Kabinet-Jetten beëdigd", 23-2-2026, https://www.rijksoverheid.nl/actueel/nieuws/2026/02/23/kabinet-jetten-beedigd                                                                                                                | Het kabinet-Jetten (D66, VVD, CDA) zit er sinds 23-2-2026.                                                                                                                                                                                                                                                                                                                                      | "…vertrouwen dat het kabinet-Jetten, waarin de VVD deelneemt, hiermee aan de slag gaat."                                                                                                                                           | URL niet zelf geopend.                                                                                                          |
| 11  | Energiesubsidies "(55%, het meeste geld komt van het Rijk)"                                                                 | Eigen begroting: 4,3 lasten / 3,3 baten. Onafhankelijke bron voor de rijksbijdrage: SPUK energiearmoede (Volkshuisvesting Nederland, 2-9-2026). Het Groningse rijksdeel is niet gevonden, en de game-data noemen zelf maar € 1,82 mln rijksgeld. |                                                                                                                                                                                                                                                                                                                                                                                                 | "Het grootste deel van de energiesubsidies wordt betaald uit inkomsten van buiten de gemeente (3,3 van de 4,3 miljoen euro)." Zonder "Rijk" en zonder externe bron (eigen begrotingscijfers).                                      | Afgezwakt.                                                                                                                      |
| 12  | Jeugdzorg: "Kinderen hebben wettelijk recht op hulp."                                                                       | Jeugdwet art. 2.3, https://wetten.overheid.nl/BWBR0034925                                                                                                                                                                                        | Het college heeft een jeugdhulpplicht. Het is geen individueel recht zoals in de Wlz.                                                                                                                                                                                                                                                                                                           | "De gemeente is wettelijk verplicht passende jeugdhulp te bieden."                                                                                                                                                                 | URL niet geopend in de sessie.                                                                                                  |
| 13  | Wmo: "wie recht heeft op hulp, blijft die krijgen"                                                                          | Wmo 2015, art. 2.3.5 en art. 2.6.6 (reële prijs), https://wetten.overheid.nl/BWBR0035362                                                                                                                                                         |                                                                                                                                                                                                                                                                                                                                                                                                 | Uitgebreid: de besparing moet uit scherpere indicaties komen, niet uit lagere tarieven.                                                                                                                                            | Juridische toevoeging, zie (c).                                                                                                 |
| 14  | Gemeentewet art. 220 (OZB niet verplicht)                                                                                   |                                                                                                                                                                                                                                                  |                                                                                                                                                                                                                                                                                                                                                                                                 | **Komt in v1 niet voor.** Niets toegevoegd. Voor gebruik elders: art. 220 Gemeentewet zegt "kunnen … worden geheven" (bevoegdheid), https://wetten.overheid.nl/BWBR0005416.                                                        | n.v.t.                                                                                                                          |

**Gecontroleerd, geen vergelijking (geen bron nodig):** "De sport staat in Groningen zwaar onder druk", "De gemeentelijke overhead is fors gestegen" (eigen begroting) en "de financiële positie staat er niet goed voor". Dit zijn politieke oordelen of cijfers uit de eigen begroting.

### Tabel inkomenstoeslag (nieuw in v2)

- **Vergelijkingsgroep:** de G4 (de grote steden), de grote studentensteden (Eindhoven, Tilburg, Nijmegen, Enschede, Maastricht, Leiden) en Leeuwarden als noordelijke stad.
- **Bedragen:** in euro per huishouden per toekenning (maximaal 1× per 12 maanden), stand 2026. Een bedrag per huishouden is het vergelijkbare gegeven; een bedrag per inwoner bestaat voor deze regeling niet in openbare statistiek (CBS splitst de IIT niet uit).

| Gemeente   | Alleenst. | Alleenst. ouder | Samenwonend | Langdurig na | Bron / status                                                                                                                                                                        |
| ---------- | --------: | --------------: | ----------: | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Groningen  |       551 |             706 |         786 | 2 jaar       | Verordening 2015 (CVDR367471), percentages omgerekend naar de normen van 2026. **[CONTROLEREN]**: eigen omrekening; dit is de gemeentelijke verordening zelf (officiële publicatie). |
| Amsterdam  |        85 |              85 |         170 | 3 jaar       | amsterdam.nl (jaartal niet expliciet) [CONTROLEREN]                                                                                                                                  |
| Rotterdam  |       200 |             300 |         350 | 1 jaar       | rotterdam.nl ("In 2026 gelden deze bedragen"); CVDR741634                                                                                                                            |
| Den Haag   |       360 |             470 |         600 | 3 jaar       | denhaag.nl (2026)                                                                                                                                                                    |
| Eindhoven  |       637 |             768 |         836 | 4 jaar       | CVDR746680; bedragen via gemeentewinkel.nl [CONTROLEREN]                                                                                                                             |
| Tilburg    |       550 |             705 |         785 | 5 jaar       | CVDR748875; tilburg.nl                                                                                                                                                               |
| Nijmegen   |       465 |             590 |         630 | 3 jaar       | CVDR759045. De website noemt € 655 voor paren [CONTROLEREN]                                                                                                                          |
| Enschede   |       120 |             120 |         170 | 5 jaar       | CVDR744533 (plus bedragen per kind)                                                                                                                                                  |
| Maastricht |       561 |             701 |         781 | 3 jaar       | gemeentemaastricht.nl (2026)                                                                                                                                                         |
| Leiden     |       462 |             577 |         635 | 5 jaar       | gemeente.leiden.nl (jaartal niet vermeld) [CONTROLEREN]                                                                                                                              |
| Leeuwarden |       533 |             685 |         761 | 3 jaar       | leeuwarden.nl, "Toelichting 2026"                                                                                                                                                    |

- **Weggelaten:**
  - **Utrecht:** de bedragen hangen af van de leeftijd van het kind en zijn alleen bekend voor inkomensjaar 2024.
  - **Assen:** geen actuele bron gevonden. De oude bedragen 349/447/498 komen letterlijk uit de verordening van 2015.
  - **Kolom "samenwonend met kinderen":** vervallen, omdat steeds meer gemeenten met kindbedragen werken en de kolom zo niet meer vergelijkbaar is.
- **Landelijk:**
  - Participatiewet in balans (Stb. 2025, 313; gefaseerd 2026-2027): de gemeente mag de IIT ambtshalve toekennen. De termijn verandert niet landelijk.
  - IPE vond gemiddeld € 488 voor een alleenstaande (jaartal onbekend, niet gebruikt).

---

## (c) Alle andere wijzigingen in v2

**Cijfers en tabellen**

1. **Tabellen "Ombuigingen en opbrengsten" en "Uitgaven":**
   - Volledig opnieuw opgebouwd uit de game.
   - Kettingeffecten staan als aparte regels ("Kettingeffect: …"). Regels die pas later iets doen, staan er met 0,0 en "(vanaf 2028)".
   - De drie programma's zijn verplaatst naar Ombuigingen (I).
   - De vergunningsposten van parkeren zijn tot één regel opgeteld, zoals in v1.
   - Sluitpost "Verbeteren financiële positie van de gemeente" = 23,968 (I).
   - Totaal beide tabellen: 138,212.
2. **Meerjarentabel:** opnieuw berekend. De regel "waarvan kettingeffecten" is toegevoegd; die zit al in de regels erboven. Saldo 23,968 / 59,762 / 74,255 / 87,502, cumulatief 245,488.
3. **Bronregel** onder de inleiding van Financieel overzicht (Ontwerpbegroting 2027 + Begrotingsgame, scenario midden, stand 31-10-2026).
4. **"Uitgangspunten meerjarenbegroting":** herschreven. De oude tekst ("geen rekening met afbouwtermijnen of kettingeffecten", "lineair") klopte niet meer.

**Teksten met bedragen of kettingeffecten**

0. **Wegenfundering WarmteStad geschrapt** (na overleg met de fractie): de post komt uit de begroting 2026 en heeft al plaatsgevonden. De alinea en de tabelregel zijn eruit, de kaart is uit de invoer gehaald. Het saldo 2027 daalt met 0,45 mln (incidenteel); 2028-2030 veranderen niet.

1. **Ambtenarenapparaat 15%:** "in de hele organisatie" en eenmalig 10,9 mln frictiekosten toegevoegd.
2. **Samenwerkingsverbanden / Regio Groningen-Assen:** de besparing op de Regio telt pas vanaf 2029 (gemeenschappelijke regeling).
3. **Zakelijke dienstverlening 100%:** "kost op papier 1,2 miljoen" vervangen door het game-beeld: 1,2 mln gemiste inkomsten + 2,0 mln doorlopende vaste kosten, vanaf 2028 1,0 mln overhead vrij; per saldo 3,2 mln in 2027 en 2,2 mln per jaar daarna. _Feitelijke correctie; de keuze blijft staan._
4. **Energiebedrijf:** de zin "waardoor de overheadkosten zullen dalen" (niet doorgerekend) is vervangen door "scheelt in 2027 eenmalig 0,2 miljoen euro".
5. **Diversiteit:** de dubbele titel ("diversiteit en diversiteit en inclusie") en de herhaalde zinnen zijn opgeschoond; 0,2 mln eenmalig genoemd.
6. **Wijk en welzijn:** subsidies netjes opzeggen (25% in 2027) en de gevolgen van minder preventie voor jeugdzorg en Wmo genoemd.
7. **Verplichte tegenprestatie:** "vanaf 2030 1,6 miljoen" gecorrigeerd naar 0 in 2027, 0,8 in 2028 en 1,6 vanaf 2029.
8. **Wmo 15%:** juridische nuance toegevoegd (maatwerkvoorziening, reële prijs art. 2.6.6 Wmo: de besparing moet uit indicaties komen, niet uit lagere tarieven). Ook: door de contracten levert het in 2027 niets op, vanaf 2028 10,3 mln.
9. **Overige taakstellingen:** de GGD-besparing telt pas vanaf 2029 (gemeenschappelijke regeling).
10. **Ongedocumenteerden:** "het vorige kabinet … met ingang van 2025" met bron; 5,6 mln eenmalig en 1,1 mln restkosten per jaar.
11. **Cultuur 40%:** de Forum-zin is vervangen (zie b.6) en de afbouw van subsidies genoemd.
12. **Stadsschouwburg:** "dat is in het bedrag verwerkt" toegevoegd (klopt met de game: de baten bewegen mee).
13. **CDOKE:** de energiesubsidies-zin is aangepast (zie b.11).
14. **Parkeercontrole 20%:** "per saldo minder oplevert dan het lijkt" is vervangen door "per saldo kost dit ongeveer 0,4 miljoen euro per jaar". _Feitelijke correctie: de post kost netto geld. Overweeg politiek of je deze keuze wilt handhaven._
15. **Betaald parkeren:** nieuwe openingszin met bron (b.3) en "ongeveer 1,7 mln van de gemiste opbrengst komt terug" (game).
16. **Toeristenbelasting:** "betaald door hotelgasten" vervangen door "door bezoekers die in Groningen overnachten" (de heffing geldt voor alle overnachtingen).
17. **Jeugdzorg 10%:** de juridische formulering is gecorrigeerd (b.12) en het preventie-effect genoemd: vanaf 2028 meer jeugdzorg, tot 4,3 mln.
18. **Preventiefonds jeugd, werkprogramma en Route Arbeid+:** de oude alinea's ("De VVD richt een preventiefonds op", "trekken we eenmalig geld uit voor een werkprogramma") zijn verwijderd. Er is een nieuwe bullet onder "Werken moet lonen": "Stoppen met extra programma's in het sociaal domein" (samen 5,9 mln eenmalig; de huidige deelnemers van Route Arbeid+ houden hun begeleiding).

> **Dit draait een politieke keuze om.** v1 zei "investeren in preventie". Het game-model kent deze posten alleen als _stopzetten_. Ik heb de tekst geschreven volgens wat de posten in de game zijn, zoals je vroeg, met de zin "De VVD kiest ervoor het geld voor jeugd en werk in de vaste budgetten te steken". Wil de fractie wél extra preventie, dan moeten deze drie kaarten uit de invoer. Het saldo 2027 daalt dan met 5,9 mln (dekking is er genoeg) en de tekst kan terug naar v1. **[CONTROLEREN]**

23. **Intensieve coaching:** 2,4 mln per jaar en de besparing op bijstand (tot 1,6 mln vanaf 2029) genoemd; de werkprogramma-zin is eruit.
24. **Verbeteren financiële positie:** 24,0 mln in 2027 en een structureel overschot tot 87,5 mln in 2030.

**Schrijfwijze en taal**

25. "BOA's" → "boa's" (titel, tekst, intro, tabel), conform het Groene Boekje.
26. "Taakstelling armoede en minimaregeling 40%" → "armoede- en minimaregelingen" (gelijk aan de tabel).
27. "het gaat er om" → "het gaat erom".
28. Tabelregel "Besparingen op het ambtenarenapparaat 15% (oplopend)".
29. "langdurig minima" → "mensen die langdurig van een minimuminkomen leven".

**Opmaak**

30. Voetnootstijl (Voetnoottekst) op Lucida Sans Unicode 8 pt, kleur 242424 (was Calibri 10 pt, ongebruikt).
31. De paginanummers in de inhoudsopgave zijn bijgewerkt.

**Gemeld, niet gewijzigd (politiek of inhoudelijk)**

- **15% minder ambtenaren voor de hele organisatie** naast +20% onderhoud en +10% boa's. In 2026 waren beheer openbare ruimte en veiligheid uitgezonderd. De game rekent de 15% over de hele loonsom (357,9 mln), dus ook over de mensen die het extra onderhoud en de boa-inzet moeten uitvoeren. Dat is inhoudelijk wrijving: overweeg de uitzondering van 2026 terug te brengen. Daarvoor bestaat in de game geen kaart; het zou een andere kaart of schuif vragen.
- **"Plaatsen meer prullenbakken en zorgen voor betere straatverlichting"** (intro Veilig en leefbaar): daarvoor is geen eigen post in de game (or_zwerfafval wacht op een nieuwe post). Lees het als onderdeel van +20% onderhoud.
- **Minder wethouders 24%:** op verzoek van de fractie aangevuld met de aanname dat vertrekkende wethouders direct een nieuwe baan hebben en afzien van wachtgeld, zodat de besparing al in 2027 volledig ingaat (alinea en Uitgangspunten meerjarenbegroting). Bedragen ongewijzigd. Zie a.3 voor het risico.
- **Basisbanen:** "middelen inzetten voor re-integratie". In werkelijkheid gaat 6,7 mln naar het saldo en 2,4 mln extra naar begeleiding naar werk. Mensen die terugvallen in de bijstand zijn niet doorgerekend.
- **Niemeyer:** "zou volledig door de markt georganiseerd worden" is een bewering over de gemeentelijke plannen zonder onafhankelijke bron. **[CONTROLEREN]**
- **SMR:** "goedkope duurzame stroom". "Duurzaam" is bij kernenergie omstreden; "CO2-arm" is onbetwist. Een politieke formulering, dus niet aangepast.
- **Opvang ongedocumenteerden:** dit is geen wettelijke taak van de gemeente; er is geen juridisch probleem. De "restkosten" zijn een aanname van de game.
- **"verkeersaso's":** apostrof niet typografisch, en informeel woordgebruik.

---

## (d) Open punten voor jou [CONTROLEREN]

1. Energiebedrijf (0,201), Niemeyer (0,25) en de drie programma's komen ook uit de begroting 2026, net als WarmteStad. Moeten die er ook uit?
1. Rik.pdf, de 2026-docx en de xlsx aanleveren, zodat ik de reconstructie van Riks invoer en de layout kan nakijken.
1. Fractienamen: Jasper/Teun (docx en pdf's) of Cassandra/Lisa (opdracht)?
1. Preventiefonds, werkprogramma en Route Arbeid+: stopzetten (v2) of investeren (v1)? Zie c.22.
1. Programmabedragen in de game die uit de begroting 2026 komen (a.3): nalopen tegen de Ontwerpbegroting 2027.
1. Inkomenstoeslag: de zin is gelezen als "termijn verlengen van 2 naar 3 jaar". Klopt dat? Controleer ook de cellen met [CONTROLEREN] in de tabel en het Groningse bedrag (eigen omrekening).
1. Alle voetnoot-URL's één keer openen. Ze konden in deze sessie niet worden geopend; vooral ANP (parkeren), OOG (Forum) en NOS (LVV).
1. LVV: heeft het kabinet-Jetten de financiering hersteld? Zo ja, dan moet de alinea anders.
1. Parkeercontrole −20% kost netto 0,4 mln. Handhaven?
1. Ambtenaren 15% zonder uitzondering voor openbare ruimte en veiligheid: bewust?
1. In Word: druk op F9 in de inhoudsopgave. De paginanummers zijn bepaald met de LibreOffice-weergave (zonder Aptos Narrow en Lucida Sans Unicode); in Word kan het een pagina schuiven.

---

## (e) Layoutcontrole t.o.v. 2026 / v1

- **Werkwijze.** Het docx is in place bewerkt (XML), niet opnieuw gemaakt. Behouden zijn de stijlen Kop 1/Kop 2/Hoofdtekst, de oranje ▶-bullets (kleur FF6400, tab, vette titel), de tabelopmaak (oranje kopregel, kolom Structureel/incidenteel, vetgedrukte totaalregels), alle afbeeldingen en scheidingspagina's, de kop- en voetteksten, het lettertype en de sectie-indeling.
- **Weergave.** Vergeleken in LibreOffice-PDF. v1 telt 16 pagina's, v2 20. De groei komt door:
  - de langere financiële tabellen (kettingeffectregels);
  - de nieuwe en langere alinea's;
  - de voetnoten.

  De volgorde en het ritme (scheidingspagina → hoofdstuk → secties) zijn gelijk. De inhoudsopgave bevat alle koppen, inclusief "Meerjarenbegroting (x1 miljoen)", met bijgewerkte paginanummers: Besparingen 4, Werken moet lonen 6, Realistische keuzes 9, Investeringen 12, Lagere lasten 12, Veilig en leefbaar 14, Toekomst 15, Financieel overzicht 17, Ombuigingen 17, Uitgaven 18, Meerjarenbegroting 19.

- **Aandachtspunten.**
  - Een paar pagina's lopen in de weergave met een korte rest door (Parkeercontrole, Toeristenbelasting, slot Uitgangspunten). In Word met de echte fonts kan dit anders vallen.
  - De afbreking "Investeringe-n" op de scheidingspagina zat al in v1; ook die komt door de fontvervanging.
- **Voetnoten.** Echte Word-voetnoten, genummerd in documentvolgorde, in de huisstijlletter. Onder de inkomenstoeslagtabel staat een bronregel in kleine cursieve tekst (in een tabel kan geen voetnoot onder de tabel).
- **Controle.** python-docx opent het bestand foutloos.
