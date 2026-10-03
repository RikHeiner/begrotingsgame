# Wijzigingen begroting 2027

Ingelezen op 2 en 3 oktober 2026 uit de ontwerpbegroting 2027 (boekwerk, p. 1-382, aangeleverd als pdf) en het raadsvoorstel *Belastingtarieven 2027*. Per deelprogramma zijn de posten uitgelezen uit "Waar gaat het geld voornamelijk naar toe" en daarna door een tweede lezer nagerekend. De spelinstellingen (ondergrenzen, teksten, meters) zijn van 2026 overgenomen.

## Wat er is veranderd in de game

- De game rekent nu met 2027 tot en met 2030 (`config.json`). De meerjarenraming sluit in 2029 (−7,8 mln) en 2030 (−10,1 mln) niet; dat telt, net als vorig jaar, niet mee in het saldo van de speler (punt 3 van de besluiten).
- **Vervallen:** `o5` Autowerkplaats voor derden (opgegaan in `o4`, p. 62) en `k3` Recreatiegebieden en bewegen (het Meerschap Paterswolde valt nu onder 2.1, in `o1`; bewegen in de openbare ruimte onder `k2`, p. 61 en 129). Het programma "bewegende stad" in het Beleidshuis hangt nu aan `k2`.
- **Nieuw:**
  - `w12` Klimaat- en energiebeleid (CDOKE), € 10,9 mln (p. 45), Nieuwbouw, ondergrens −100%.
  - `c5` Cultureel vastgoed (Martiniplaza, Forum, Oosterpoort), € 11,5 mln lasten en € 8,1 mln baten (p. 139), Schouwburg, ondergrens −25% (vaste lasten van de gebouwen, aanname).
- `c3` heet nu "Cultuur- en evenementenbeleid": de gebouwen staan in `c5`, dus de ondergrens van `c3` (was −85% voor het Forum-gebouw) is nu −100%.
- `o4` heet nu "Zakelijke dienstverlening (bedrijfsafval, werkplaats)" en omvat ook klein gevaarlijk afval, straatreiniging voor derden en de werkplaats.
- Belastingen: OZB € 139,4 mln, toeristen- (logies)belasting € 3,0 mln, reclamebelasting € 1,0 mln, precario € 1,9 mln (p. 5 en 275). Parkeren € 36,3 mln: de parkeerbelasting van € 27,5 mln plus de garages en vergunningen zoals in 2026.
- `tarieven-2027.json` (raadsvoorstel Belastingtarieven 2027) en `parkeren-2027.json` (tarieven van 2026 geïndexeerd met 4,58%; de nieuwe uurtarieven per zone volgen uit de tarievenbijlage).
- Nieuw: bij de gebouwen de uitgaven per inwoner naast die van andere grote gemeenten, uit de begrotingen 2026 (`uitgaven-gemeenten-2026.json`, BEVINDINGEN punt 62). Steeds met het jaartal erbij.
- De vergelijking met de woonlasten van andere gemeenten blijft die van 2026 (COELO 2027 verschijnt pas in het voorjaar); de game noemt het jaartal.
- Kettingeffecten: personeelskosten € 357,9 mln (3.681 fte, p. 355) in `org_frictie`, dat nu ook rekent (wie in één keer meer ambtenaren schrapt dan natuurlijk verloop toelaat, betaalt eenmalig frictiegeld). Algemene reserve € 86,5 mln en ratio 152% (p. 5) in `fin_reserves`. `kd_werkplaats` hangt nu aan `o4`.
- De kaarten uit de VVD-tegenbegroting 2026 (15 kaarten en het plan "minder prullenbakken") zijn er voorlopig uit, op verzoek van de fractie (3 oktober). Ze staan als vervallen in de id-mapping en komen terug met de tegenbegroting 2027. De vergelijking op het eindscherm is uit tot die er is.
- **Beleidskeuze** in het Beleidshuis: "Stoppen met de opvang van ongedocumenteerden", € 5,6 mln incidenteel (p. 122, `k_ongedoc`).
- `e7` heet nu "Strategisch bezit en grondzaken (panden, kavels en grond)" en omvat Strategisch bezit (4,7 / 4,3), Verhuurde kavels en niet in exploitatie genomen gronden (1,9 / 2,5) en Grondzaken overig (5,1 / 2,5): samen € 11,7 mln lasten en € 9,3 mln baten (besluit fractie, 3 oktober).
- `w12` en `c5` blijven als nieuwe posten (besluit fractie, 3 oktober).
- Netlify publiceert alleen als `[netlify]` in het commitbericht staat (`netlify.toml`).
- Antwoord op een open vraag: de overhead van de bouwleges is € 3,563 mln op € 12,123 mln kosten; opbrengst € 16,492 mln, dekking 105% (paragraaf lokale heffingen, p. 276).

## Te controleren (`"controleren": true`)

- `o4`, `o6`: samengevoegd of anders ingedeeld (zie boven; `o6` = Meerjarenprogramma Leefkwaliteit 3,2 + Bodembeheer 0,8).
- `c2` Cultuurnota (29,0): alleen nog de cultuurnota-instellingen; andere beleidsinstrumenten staan nu bij `c3`.
- `g2` Raad, griffie en rekenkamer (4,35): de rekenkamer staat in 2027 apart (0,25) en is meegeteld.

## Niet als post opgenomen

- Procesregie onbegrepen gedrag (0,6 mln, p. 71), Erfpacht, Bovenwijkse infrastructuur, Leges Burgerzaken, ICT en de rijksgeldregels in 4.2 (Nij Begun, Blok B, NPG): overige posten, zoals in 2026.

## Bekende afwijkingen

- 2.1: de regels samen (152,2) zijn hoger dan het deelprogramma (150,9), zoals in 2026.
- 2029 en 2030: in het boekwerk zelf zijn de deelprogramma's samen 81 duizend euro hoger dan "Lasten totaal" en "Baten totaal" (p. 352-353).

## Nog te doen

- De ondergrenzen en de bedragen in het Beleidshuis nalopen met het boekwerk 2027 (veel programma's van 2026 waren intensiveringen).
- De nieuwe uurtarieven en vergunningtarieven per zone uit de tarievenbijlage, en nieuwe aantallen vergunningen.
- De VVD-tegenbegroting 2027.

## Verschillen per post

Bronnen: Ontwerpbegroting 2026 gemeente Groningen (boekwerk, bijlage 2) en Ontwerpbegroting 2027 gemeente Groningen (boekwerk). Bedragen in miljoenen euro's.

## Totalen

| Raming voor 2027 | Begroting 2026 | Begroting 2027 | Verschil |
|---|---:|---:|---:|
| Lasten excl. reserves | 1.479,9 | 1.585,6 | +105,7 |
| Baten excl. reserves | 1.496,8 | 1.563,0 | +66,1 |

## Nieuwe posten (2)

- `w12` Klimaat- en energiebeleid (CDOKE) (onderdeel, lasten 10,900, baten 0,000)
- `c5` Cultureel vastgoed (Martiniplaza, Forum, Oosterpoort) (onderdeel, lasten 11,500, baten 8,100)

## Vervallen posten (17)

- `k3` Recreatiegebieden en bewegen (onderdeel)
- `k_vast` Gemeentelijk vastgoed verkopen (actiekaart)
- `k_warm` Minderheidsbelang WarmteStad verkopen (actiekaart)
- `k_zon` Zonnepark Meerstad-Noord niet aanleggen (actiekaart)
- `k_wind` Windpark Roodehaan stoppen (actiekaart)
- `k_laad` Laadpalen aan de markt laten (actiekaart)
- `k_eiw` Stoppen met de eiwittransitie (actiekaart)
- `k_cas` Casinolocatie aan de markt laten (actiekaart)
- `k_kwijt` Kwijtschelding gemeentelijke belastingen schrappen (actiekaart)
- `k_brug` Bruggenfonds (actiekaart)
- `k_fc` Trainingscomplex FC Groningen (actiekaart)
- `k_licht` Betere straatverlichting (actiekaart)
- `k_res` Reserves aanvullen (actiekaart)
- `k_smr` Onderzoek kleine kerncentrale (SMR) (actiekaart)
- `k_bouw` Sneller-bouwenfonds (actiekaart)
- `k_ai` Investeren in AI (actiekaart)
- `p_prullenbakken` Meer prullenbakken op straat (actiekaart)

## Andere naam (5)

- `e7` Strategisch bezit (panden en grond) → `e7` Strategisch bezit en grondzaken (panden, kavels en grond)
- `o4` Bedrijfsafval inzamelen → `o4` Zakelijke dienstverlening (bedrijfsafval, werkplaats)
- `o5` Autowerkplaats voor derden → `o4` Zakelijke dienstverlening (bedrijfsafval, werkplaats)
- `c3` Overal cultuur (o.a. Forum, broedplaatsen) → `c3` Cultuur- en evenementenbeleid (o.a. bibliotheek, media, evenementen)
- `k_ongedoc` Stoppen met opvang ongedocumenteerden → `k_ongedoc` Stoppen met de opvang van ongedocumenteerden

## Grootste stijgers (lasten)

| Post | Naam | Lasten oud | Lasten nieuw | Verschil | % |
|---|---|---:|---:|---:|---:|
| `o4` | Zakelijke dienstverlening (bedrijfsafval, werkplaats) | 0,900 | 9,900 | +9,000 | +1.000,0 |
| `z1` | Jeugdzorg | 118,800 | 127,700 | +8,900 | +7,5 |
| `s1` | Bijstandsuitkeringen | 199,000 | 205,100 | +6,100 | +3,1 |
| `z3` | Wmo (huishoudelijke hulp, hulpmiddelen) | 64,700 | 70,800 | +6,100 | +9,4 |
| `o1` | Onderhoud straten, groen en speeltuinen | 66,400 | 72,400 | +6,000 | +9,0 |
| `h1` | Overhead (staf, ICT, huisvesting, HR) | 129,180 | 134,900 | +5,720 | +4,4 |
| `z5` | Daklozen- en vrouwenopvang | 28,600 | 34,200 | +5,600 | +19,6 |
| `z2` | Beschermd wonen | 84,400 | 88,100 | +3,700 | +4,4 |
| `s10` | Armoede- en minimaregelingen | 12,200 | 15,500 | +3,300 | +27,0 |
| `s3` | Begeleiding naar werk | 20,700 | 23,800 | +3,100 | +15,0 |

## Grootste dalers (lasten)

| Post | Naam | Lasten oud | Lasten nieuw | Verschil | % |
|---|---|---:|---:|---:|---:|
| `w6` | Energiesubsidies | 12,000 | 4,300 | −7,700 | −64,2 |
| `z6` | Gezondheid (GGD) | 18,800 | 12,000 | −6,800 | −36,2 |
| `c3` | Cultuur- en evenementenbeleid (o.a. bibliotheek, media, evenementen) | 14,000 | 10,500 | −3,500 | −25,0 |
| `g4` | Wijkvernieuwing (o.a. Selwerd, De Wijert, Beijum) | 8,150 | 6,150 | −2,000 | −24,5 |
| `w8` | Omgevingsvergunningen | 10,500 | 9,000 | −1,500 | −14,3 |
| `c2` | Culturele instellingen en subsidies | 30,200 | 29,000 | −1,200 | −4,0 |
| `e9` | Regio Groningen-Assen | 1,600 | 1,100 | −0,500 | −31,3 |
| `o6` | Leefkwaliteit (groen en spelen in wijken) | 4,500 | 4,000 | −0,500 | −11,1 |
| `k2` | Sportstimulering | 2,200 | 1,800 | −0,400 | −18,2 |
| `w3` | Goed verhuurderschap | 1,250 | 0,900 | −0,350 | −28,0 |

## Gewijzigde baten, opbrengsten en kaartbedragen (43)

| Post | Naam | Oud | Nieuw | Verschil |
|---|---|---:|---:|---:|
| `e7` | Strategisch bezit en grondzaken (panden, kavels en grond) | 5,900 | 9,300 | +3,400 |
| `e10` | Ambtenaren gebiedsontwikkeling | 0,000 | 0,100 | +0,100 |
| `m2` | Parkeercontrole | 6,000 | 6,300 | +0,300 |
| `w6` | Energiesubsidies | 11,700 | 3,300 | −8,400 |
| `w8` | Omgevingsvergunningen | 17,900 | 16,500 | −1,400 |
| `o1` | Onderhoud straten, groen en speeltuinen | 1,900 | 2,100 | +0,200 |
| `o3` | Afvalinzameling huishoudens | 41,400 | 45,000 | +3,600 |
| `o2` | Riolering | 23,700 | 25,800 | +2,100 |
| `o4` | Zakelijke dienstverlening (bedrijfsafval, werkplaats) | 9,100 | 11,100 | +2,000 |
| `o4` | Zakelijke dienstverlening (bedrijfsafval, werkplaats) | 0,900 | 11,100 | +10,200 |
| `v2` | Boa's en toezicht op straat | 0,100 | 0,000 | −0,100 |
| `v4` | Ondermijning (drugs en criminele geldstromen) | 0,200 | 0,000 | −0,200 |
| `v5` | Jeugd en veiligheid | 1,900 | 1,500 | −0,400 |
| `v6` | Zorg- en Veiligheidshuis | 1,200 | 1,300 | +0,100 |
| `v9` | Reclamezuilen op straat | 1,200 | 1,500 | +0,300 |
| `s1` | Bijstandsuitkeringen | 186,800 | 194,400 | +7,600 |
| `s2` | Sociale werkvoorziening (Iederz) | 5,500 | 5,700 | +0,200 |
| `s4` | Loonkostensubsidie | 11,300 | 13,100 | +1,800 |
| `s5` | Werk in Zicht | 6,700 | 9,800 | +3,100 |
| `s6` | Basisbanen | 2,900 | 2,700 | −0,200 |
| `s9` | Schuldhulpverlening | 1,100 | 0,700 | −0,400 |
| `s10` | Armoede- en minimaregelingen | 0,000 | 1,600 | +1,600 |
| `s11` | Bijzondere bijstand | 0,500 | 0,460 | −0,040 |
| `s7` | Inburgering | 3,000 | 3,500 | +0,500 |
| `z1` | Jeugdzorg | 1,400 | 1,800 | +0,400 |
| `z3` | Wmo (huishoudelijke hulp, hulpmiddelen) | 1,900 | 2,000 | +0,100 |
| `z5` | Daklozen- en vrouwenopvang | 3,600 | 6,000 | +2,400 |
| `z6` | Gezondheid (GGD) | 6,600 | 0,000 | −6,600 |
| `z7` | Huiselijk geweld en kindermishandeling | 3,600 | 7,300 | +3,700 |
| `z8` | Welzijnsinstellingen en buurthuizen | 0,250 | 0,246 | −0,004 |
| `z9` | Sociale samenhang in wijken | 0,000 | 0,500 | +0,500 |
| `d1` | Schoolgebouwen | 4,000 | 4,400 | +0,400 |
| `k1` | Sporthallen, zwembaden en ijsbaan | 11,200 | 12,100 | +0,900 |
| `k2` | Sportstimulering | 1,100 | 0,000 | −1,100 |
| `c1` | Stadsschouwburg en Oosterpoort | 16,600 | 18,200 | +1,600 |
| `c3` | Cultuur- en evenementenbeleid (o.a. bibliotheek, media, evenementen) | 4,900 | 0,500 | −4,400 |
| `h1` | Overhead (staf, ICT, huisvesting, HR) | 5,944 | 3,400 | −2,544 |
| `t1` | Onroerendezaakbelasting (OZB) | 125,300 | 139,441 | +14,141 |
| `t5` | Parkeertarieven | 35,100 | 36,299 | +1,199 |
| `t2` | Toeristenbelasting | 2,900 | 2,998 | +0,098 |
| `t4` | Precariobelasting | 1,800 | 1,866 | +0,066 |
| `t3` | Reclamebelasting | 0,700 | 0,980 | +0,280 |
| `k_ongedoc` | Stoppen met de opvang van ongedocumenteerden | 3,500 | 5,600 | +2,100 |

## Alle gewijzigde lasten (77)

| Post | Naam | Lasten oud | Lasten nieuw | Verschil | % |
|---|---|---:|---:|---:|---:|
| `e2` | Ambtenaren economische zaken | 2,900 | 3,200 | +0,300 | +10,3 |
| `e5` | Markten, havens en brugbediening | 2,500 | 2,800 | +0,300 | +12,0 |
| `e6` | Bedrijventerreinen en winkelcentra | 1,545 | 1,550 | +0,005 | +0,3 |
| `e7` | Strategisch bezit en grondzaken (panden, kavels en grond) | 9,800 | 11,700 | +1,900 | +19,4 |
| `e8` | Suikerzijde (gebiedsontwikkeling) | 3,840 | 4,300 | +0,460 | +12,0 |
| `e9` | Regio Groningen-Assen | 1,600 | 1,100 | −0,500 | −31,3 |
| `e10` | Ambtenaren gebiedsontwikkeling | 6,800 | 7,100 | +0,300 | +4,4 |
| `e11` | Rente en afschrijving (o.a. Meerstad) | 10,700 | 11,500 | +0,800 | +7,5 |
| `m2` | Parkeercontrole | 5,000 | 7,300 | +2,300 | +46,0 |
| `m3` | Extra geld mobiliteit | 5,280 | 5,570 | +0,290 | +5,5 |
| `m4` | Uitvoering mobiliteitsvisie | 1,500 | 1,560 | +0,060 | +4,0 |
| `m5` | Fietsenstallingen centrum | 0,500 | 1,000 | +0,500 | +100,0 |
| `m6` | Binnenstadsprogramma | 2,060 | 2,240 | +0,180 | +8,7 |
| `m11` | Ambtenaren mobiliteit | 3,100 | 3,300 | +0,200 | +6,5 |
| `m10` | Rente en afschrijving wegen | 6,100 | 6,500 | +0,400 | +6,6 |
| `w3` | Goed verhuurderschap | 1,250 | 0,900 | −0,350 | −28,0 |
| `w4` | Ambtenaren wonen | 4,600 | 4,900 | +0,300 | +6,5 |
| `w6` | Energiesubsidies | 12,000 | 4,300 | −7,700 | −64,2 |
| `w7` | Extra geld energietransitie | 2,275 | 2,300 | +0,025 | +1,1 |
| `w8` | Omgevingsvergunningen | 10,500 | 9,000 | −1,500 | −14,3 |
| `w10` | Toezicht op bouwen | 2,100 | 2,000 | −0,100 | −4,8 |
| `w11` | Verduurzamen gemeentegebouwen | 1,300 | 1,100 | −0,200 | −15,4 |
| `o1` | Onderhoud straten, groen en speeltuinen | 66,400 | 72,400 | +6,000 | +9,0 |
| `o3` | Afvalinzameling huishoudens | 36,800 | 39,700 | +2,900 | +7,9 |
| `o2` | Riolering | 22,500 | 24,400 | +1,900 | +8,4 |
| `o4` | Zakelijke dienstverlening (bedrijfsafval, werkplaats) | 7,600 | 9,900 | +2,300 | +30,3 |
| `o4` | Zakelijke dienstverlening (bedrijfsafval, werkplaats) | 0,900 | 9,900 | +9,000 | +1.000,0 |
| `o6` | Leefkwaliteit (groen en spelen in wijken) | 4,500 | 4,000 | −0,500 | −11,1 |
| `o8` | Geo en data | 1,100 | 1,800 | +0,700 | +63,6 |
| `v2` | Boa's en toezicht op straat | 3,400 | 3,700 | +0,300 | +8,8 |
| `v3` | Openbare orde en veiligheid | 3,800 | 5,700 | +1,900 | +50,0 |
| `v4` | Ondermijning (drugs en criminele geldstromen) | 1,500 | 1,400 | −0,100 | −6,7 |
| `v5` | Jeugd en veiligheid | 4,000 | 4,300 | +0,300 | +7,5 |
| `v6` | Zorg- en Veiligheidshuis | 2,200 | 2,300 | +0,100 | +4,5 |
| `v1` | Brandweer en ambulancezorg (Veiligheidsregio) | 25,700 | 26,900 | +1,200 | +4,7 |
| `v8` | Omgevingsdienst | 1,747 | 1,800 | +0,053 | +3,0 |
| `s3` | Begeleiding naar werk | 20,700 | 23,800 | +3,100 | +15,0 |
| `s1` | Bijstandsuitkeringen | 199,000 | 205,100 | +6,100 | +3,1 |
| `s2` | Sociale werkvoorziening (Iederz) | 38,400 | 40,000 | +1,600 | +4,2 |
| `s4` | Loonkostensubsidie | 11,800 | 13,400 | +1,600 | +13,6 |
| `s5` | Werk in Zicht | 9,400 | 11,600 | +2,200 | +23,4 |
| `s8` | Afspraakbanen | 3,400 | 3,600 | +0,200 | +5,9 |
| `s9` | Schuldhulpverlening | 11,300 | 11,600 | +0,300 | +2,7 |
| `s10` | Armoede- en minimaregelingen | 12,200 | 15,500 | +3,300 | +27,0 |
| `s11` | Bijzondere bijstand | 6,100 | 5,900 | −0,200 | −3,3 |
| `s7` | Inburgering | 5,000 | 6,700 | +1,700 | +34,0 |
| `z1` | Jeugdzorg | 118,800 | 127,700 | +8,900 | +7,5 |
| `z2` | Beschermd wonen | 84,400 | 88,100 | +3,700 | +4,4 |
| `z3` | Wmo (huishoudelijke hulp, hulpmiddelen) | 64,700 | 70,800 | +6,100 | +9,4 |
| `z4` | WIJ-teams in de wijk | 44,200 | 46,300 | +2,100 | +4,8 |
| `z5` | Daklozen- en vrouwenopvang | 28,600 | 34,200 | +5,600 | +19,6 |
| `z6` | Gezondheid (GGD) | 18,800 | 12,000 | −6,800 | −36,2 |
| `z7` | Huiselijk geweld en kindermishandeling | 10,200 | 11,900 | +1,700 | +16,7 |
| `z8` | Welzijnsinstellingen en buurthuizen | 8,200 | 8,700 | +0,500 | +6,1 |
| `z9` | Sociale samenhang in wijken | 7,900 | 7,600 | −0,300 | −3,8 |
| `z10` | Diversiteit en inclusie | 1,200 | 1,400 | +0,200 | +16,7 |
| `z11` | Opvang vluchtelingen en asielzoekers | 0,958 | 1,200 | +0,242 | +25,3 |
| `d1` | Schoolgebouwen | 19,800 | 22,600 | +2,800 | +14,1 |
| `d2` | Onderwijskansen | 12,300 | 12,400 | +0,100 | +0,8 |
| `d4` | Voortijdig schoolverlaten | 3,500 | 4,400 | +0,900 | +25,7 |
| `d5` | Leerlingenvervoer | 2,600 | 2,900 | +0,300 | +11,5 |
| `d6` | Natuur- en duurzaamheidseducatie | 1,300 | 1,400 | +0,100 | +7,7 |
| `k1` | Sporthallen, zwembaden en ijsbaan | 36,500 | 39,400 | +2,900 | +7,9 |
| `k2` | Sportstimulering | 2,200 | 1,800 | −0,400 | −18,2 |
| `c1` | Stadsschouwburg en Oosterpoort | 26,100 | 28,900 | +2,800 | +10,7 |
| `c2` | Culturele instellingen en subsidies | 30,200 | 29,000 | −1,200 | −4,0 |
| `c3` | Cultuur- en evenementenbeleid (o.a. bibliotheek, media, evenementen) | 14,000 | 10,500 | −3,500 | −25,0 |
| `c4` | Groninger Archieven | 2,800 | 3,400 | +0,600 | +21,4 |
| `g1` | College van burgemeester en wethouders | 2,534 | 2,400 | −0,134 | −5,3 |
| `g2` | Gemeenteraad en griffie | 3,733 | 4,350 | +0,617 | +16,5 |
| `g4` | Wijkvernieuwing (o.a. Selwerd, De Wijert, Beijum) | 8,150 | 6,150 | −2,000 | −24,5 |
| `g5` | Samenwerkingsverbanden | 1,753 | 2,100 | +0,347 | +19,8 |
| `g7` | Concernposten | 5,000 | 5,900 | +0,900 | +18,0 |
| `b1` | Burgerzaken (paspoort, rijbewijs) | 5,400 | 5,900 | +0,500 | +9,3 |
| `b2` | Klantcontactcentrum | 3,800 | 4,100 | +0,300 | +7,9 |
| `b3` | Uitvoering belastingen | 5,000 | 4,900 | −0,100 | −2,0 |
| `h1` | Overhead (staf, ICT, huisvesting, HR) | 129,180 | 134,900 | +5,720 | +4,4 |
