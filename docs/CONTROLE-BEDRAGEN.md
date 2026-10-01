# Controle van alle bedragen (begroting 2026)

Gemaakt met `npm run bedragen:controle` op 2026-10-01. Dit bestand wordt
elke keer opnieuw gemaakt; zet vinkjes en opmerkingen dus in een kopie, of in BEVINDINGEN.md.

Bedragen in miljoenen euro's, tenzij anders vermeld. Bron: [Ontwerpbegroting 2026 gemeente Groningen (boekwerk, bijlage 2)](https://gemeenteraad.groningen.nl/Documenten/Bijlage-2-Ontwerpbegroting-2026-boekwerk.pdf).

## 1. Automatische controles

- `data:check`: **0 fouten, 6 waarschuwingen** ✓

| Controle | Uitkomst | Toelichting |
| --- | --- | --- |
| OZB (schuif t1) en kengetal OZB | ✓ klopt | 125,300 tegenover 125,336 mln |
| Toeristenbelasting (t2) en kengetal logiesbelasting | ✓ klopt | 2,900 tegenover 2,903 mln |
| Reclamebelasting (t3) en kengetal | ✓ klopt | 0,700 tegenover 0,700 mln |
| Precariobelasting (t4) en kengetal | ✓ klopt | 1,800 tegenover 1,784 mln |
| Parkeerposten samen en schuif t5 | ✓ klopt | 35,100 tegenover 35,100 mln |
| Parkeerposten zonder garages en kengetal parkeerbelasting | ✓ klopt | 26,325 tegenover 26,325 mln |
| Zonder keuzes is het saldo in elk jaar € 0 | ✓ klopt | het saldo telt ten opzichte van de begroting |
| Campagne met dezelfde keuzes = gewone begroting | ✓ klopt | overhead −10% in vier rondes |
| Het kan en moet anders. Tegenbegroting VVD Groningen op de ontwerpbegroting 2026: saldo structureel in de game = tabel van de fractie | ✓ klopt | −0,059 tegenover −0,059 mln |

```
⚠︎ [deelprogramma] De onderdelen van 2.1 (Kwaliteit leefomgeving) tellen op tot 139.800 mln; het deelprogramma heeft 139.531 mln lasten in 2026. (bekende afwijking)
⚠︎ [totalen] 2026: de baten van de deelprogramma's (1514976) wijken 2 (x € 1.000) af van de totalen inclusief reservemutaties (1514978). Dat past bij afronding.
⚠︎ [totalen] 2028: de baten van de deelprogramma's (1525034) wijken 3 (x € 1.000) af van de totalen inclusief reservemutaties (1525031). Dat past bij afronding.
⚠︎ [parkeren] Uurtarief Zone 3 (onder andere Paddepoel, Selwerd, Helpman, De Linie): tarief van 2023 en geen indexatie naar 2026. Vervang het tarief of vul "indexatie" aan.
⚠︎ [parkeren] Uurtarief Zone 4 (Hoornse Meer, De Wijert-Zuid, Stadspark, Oosterhoogebrug): tarief van 2023 en geen indexatie naar 2026. Vervang het tarief of vul "indexatie" aan.
⚠︎ [parkeren] bedrijven: de gebieden tellen op tot 2215, de bron noemt 2216 (verschil -1).

0 fouten, 6 waarschuwingen, 0 meldingen.
```

## 2. Totalen en kengetallen

| Wat | 2026 | 2027 | 2028 | 2029 | Bron |
| --- | --- | --- | --- | --- | --- |
| Lasten (excl. reserves) | 1.481,991 | 1.479,934 | 1.494,460 | 1.536,595 | boekwerk p. 353 |
| Baten (excl. reserves) | 1.481,492 | 1.496,806 | 1.514,749 | 1.554,150 | boekwerk p. 353 |

| Kengetal | Waarde | Bron |
| --- | --- | --- |
| gemeentefonds_x1000 | 825.768 | boekwerk p. 4 (kerngegevens) |
| opbrengst_belastingen_totaal_x1000 | 157.189 | boekwerk p. 4 (kerngegevens) |
| ozb_x1000 | 125.336 | boekwerk p. 4 (kerngegevens) |
| algemene_reserve_x1000 | 81.138 | boekwerk p. 4 (kerngegevens) |
| ratio_weerstandsvermogen | 1,61 | boekwerk p. 4 (kerngegevens) |
| aantal_woningen | 126.796 | boekwerk p. 4 (kerngegevens) |
| gemiddelde_woz | 340.000 | boekwerk p. 4 (kerngegevens) |
| parkeerbelasting_x1000 | 26.325 | boekwerk p. 4 (kerngegevens) |
| reclamebelasting_x1000 | 700 | boekwerk p. 4 (kerngegevens) |
| logiesbelasting_x1000 | 2.903 | boekwerk p. 4 (kerngegevens) |
| precariobelasting_x1000 | 1.784 | boekwerk p. 4 (kerngegevens) |
| roerende_zaakbelasting_x1000 | 141 | boekwerk p. 4 (kerngegevens) |

## 3. Deelprogramma's

| Code | Naam | Lasten 2026 | Baten 2026 | Som van de posten (lasten) | Bron |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Economie en werkgelegenheid | 48,504 | 11,791 | 44,585 | boekwerk p. 352-353 |
| 1.2 | Mobiliteit | 53,828 | 41,830 | 24,778 | boekwerk p. 352-353 |
| 1.3 | Wonen | 46,678 | 30,849 | 37,000 | boekwerk p. 352-353 |
| 2.1 | Kwaliteit leefomgeving | 139,531 | 81,144 | 139,800 | boekwerk p. 352-353 |
| 2.2 | Veiligheid | 49,178 | 7,512 | 42,847 | boekwerk p. 352-353 |
| 3.1 | Werk en inkomen | 335,448 | 219,163 | 330,900 | boekwerk p. 352-353 |
| 3.2 | Onderwijs | 52,034 | 22,096 | 39,500 | boekwerk p. 352-353 |
| 3.3 | Welzijn, gezondheid, zorg en diversiteit | 427,869 | 41,937 | 387,958 | boekwerk p. 352-353 |
| 3.4 | Sport en bewegen | 43,124 | 12,368 | 39,800 | boekwerk p. 352-353 |
| 3.5 | Cultuur en evenementen | 77,293 | 22,409 | 73,100 | boekwerk p. 352-353 |
| 4.1 | Dienstverlening | 20,483 | 5,959 | 14,200 | boekwerk p. 352-353 |
| 4.2 | College, raad, wijkontwikkeling en wijkvernieuwing | 72,420 | 44,997 | 25,420 | boekwerk p. 352-353 |
| 4.3 | Algemene inkomsten en post onvoorzien | 8,462 | 962,731 | – | boekwerk p. 352-353 |
| 4.4 | Overhead en ondersteuning organisatie | 140,125 | 10,190 | 129,180 | boekwerk p. 352-353 |

## 4. Posten (schuiven)

Lasten en meebewegende baten per post. ✓ = gecontroleerd tegen het boekwerk (in te vullen).

| ✓ | Id | Post | Dp. | Lasten | Baten | Grenzen | Bron |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ☐ | e1 | Economische agenda | 1.1 | 1,400 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e2 | Ambtenaren economische zaken | 1.1 | 2,900 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e3 | Citymarketing en economische activiteiten | 1.1 | 2,250 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e4 | Akkoord van Groningen (RUG, Hanze, UMCG) | 1.1 | 1,250 | 0,750 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e5 | Markten, havens en brugbediening | 1.1 | 2,500 | 1,300 | -40% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e6 | Bedrijventerreinen en winkelcentra | 1.1 | 1,545 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e7 | Strategisch bezit (panden en grond) | 1.1 | 9,800 | 5,900 | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e8 | Suikerzijde (gebiedsontwikkeling) | 1.1 | 3,840 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e9 | Regio Groningen-Assen | 1.1 | 1,600 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e10 | Ambtenaren gebiedsontwikkeling | 1.1 | 6,800 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | e11 | Rente en afschrijving (o.a. Meerstad) | 1.1 | 10,700 | – | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m2 | Parkeercontrole | 1.2 | 5,000 | 6,000 | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m3 | Extra geld mobiliteit | 1.2 | 5,280 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m4 | Uitvoering mobiliteitsvisie | 1.2 | 1,500 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m5 | Fietsenstallingen centrum | 1.2 | 0,500 | – | -100% tot +100% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m6 | Binnenstadsprogramma | 1.2 | 2,060 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m7 | Stationsgebied | 1.2 | 0,988 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m9 | Oosterhamrikzone | 1.2 | 0,250 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m11 | Ambtenaren mobiliteit | 1.2 | 3,100 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | m10 | Rente en afschrijving wegen | 1.2 | 6,100 | – | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w1 | Extra geld wonen | 1.3 | 1,775 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w2 | Meer betaalbare woningen | 1.3 | 1,200 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w3 | Goed verhuurderschap | 1.3 | 1,250 | 0,500 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w4 | Ambtenaren wonen | 1.3 | 4,600 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w6 | Energiesubsidies | 1.3 | 12,000 | 11,700 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w7 | Extra geld energietransitie | 1.3 | 2,275 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w8 | Omgevingsvergunningen | 1.3 | 10,500 | 17,900 | -50% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w10 | Toezicht op bouwen | 1.3 | 2,100 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | w11 | Verduurzamen gemeentegebouwen | 1.3 | 1,300 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o1 | Onderhoud straten, groen en speeltuinen | 2.1 | 66,400 | 1,900 | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o3 | Afvalinzameling huishoudens | 2.1 | 36,800 | 41,400 | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o2 | Riolering | 2.1 | 22,500 | 23,700 | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o4 | Bedrijfsafval inzamelen | 2.1 | 7,600 | 9,100 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o5 | Autowerkplaats voor derden | 2.1 | 0,900 | 0,900 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o6 | Leefkwaliteit (groen en spelen in wijken) | 2.1 | 4,500 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | o8 | Geo en data | 2.1 | 1,100 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v2 | Boa's en toezicht op straat | 2.2 | 3,400 | 0,100 | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v3 | Openbare orde en veiligheid | 2.2 | 3,800 | – | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v4 | Ondermijning (drugs en criminele geldstromen) | 2.2 | 1,500 | 0,200 | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v5 | Jeugd en veiligheid | 2.2 | 4,000 | 1,900 | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v6 | Zorg- en Veiligheidshuis | 2.2 | 2,200 | 1,200 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v9 | Reclamezuilen op straat | 2.2 | 0,500 | 1,200 | -100% tot +100% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v1 | Brandweer en ambulancezorg (Veiligheidsregio) | 2.2 | 25,700 | – | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | v8 | Omgevingsdienst | 2.2 | 1,747 | – | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s3 | Begeleiding naar werk | 3.1 | 20,700 | – | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s1 | Bijstandsuitkeringen | 3.1 | 199,000 | 186,800 | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s2 | Sociale werkvoorziening (Iederz) | 3.1 | 38,400 | 5,500 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s4 | Loonkostensubsidie | 3.1 | 11,800 | 11,300 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s5 | Werk in Zicht | 3.1 | 9,400 | 6,700 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s6 | Basisbanen | 3.1 | 9,400 | 2,900 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s8 | Afspraakbanen | 3.1 | 3,400 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s9 | Schuldhulpverlening | 3.1 | 11,300 | 1,100 | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s10 | Armoede- en minimaregelingen | 3.1 | 12,200 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s11 | Bijzondere bijstand | 3.1 | 6,100 | 0,500 | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s12 | Individuele inkomenstoeslag | 3.1 | 4,200 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | s7 | Inburgering | 3.1 | 5,000 | 3,000 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z1 | Jeugdzorg | 3.3 | 118,800 | 1,400 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z2 | Beschermd wonen | 3.3 | 84,400 | 1,400 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z3 | Wmo (huishoudelijke hulp, hulpmiddelen) | 3.3 | 64,700 | 1,900 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z4 | WIJ-teams in de wijk | 3.3 | 44,200 | – | -25% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z5 | Daklozen- en vrouwenopvang | 3.3 | 28,600 | 3,600 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z6 | Gezondheid (GGD) | 3.3 | 18,800 | 6,600 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z7 | Huiselijk geweld en kindermishandeling | 3.3 | 10,200 | 3,600 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z8 | Welzijnsinstellingen en buurthuizen | 3.3 | 8,200 | 0,250 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z9 | Sociale samenhang in wijken | 3.3 | 7,900 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z10 | Diversiteit en inclusie | 3.3 | 1,200 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | z11 | Opvang vluchtelingen en asielzoekers | 3.3 | 0,958 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | d1 | Schoolgebouwen | 3.2 | 19,800 | 4,000 | -10% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | d2 | Onderwijskansen | 3.2 | 12,300 | 4,700 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | d4 | Voortijdig schoolverlaten | 3.2 | 3,500 | 2,400 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | d5 | Leerlingenvervoer | 3.2 | 2,600 | – | 🔒 vast | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | d6 | Natuur- en duurzaamheidseducatie | 3.2 | 1,300 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | k1 | Sporthallen, zwembaden en ijsbaan | 3.4 | 36,500 | 11,200 | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.4 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | k2 | Sportstimulering | 3.4 | 2,200 | 1,100 | -100% tot +50% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.4 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | k3 | Recreatiegebieden en bewegen | 3.4 | 1,100 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.4 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | c1 | Stadsschouwburg en Oosterpoort | 3.5 | 26,100 | 16,600 | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | c2 | Culturele instellingen en subsidies | 3.5 | 30,200 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | c3 | Overal cultuur (o.a. Forum, broedplaatsen) | 3.5 | 14,000 | 4,900 | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | c4 | Groninger Archieven | 3.5 | 2,800 | – | -25% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | g1 | College van burgemeester en wethouders | 4.2 | 2,534 | – | -40% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | g2 | Gemeenteraad en griffie | 4.2 | 3,733 | – | -25% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | g3 | Wijkbudgetten | 4.2 | 4,250 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | g4 | Wijkvernieuwing (o.a. Selwerd, De Wijert, Beijum) | 4.2 | 8,150 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | g5 | Samenwerkingsverbanden | 4.2 | 1,753 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | g7 | Concernposten | 4.2 | 5,000 | – | -100% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | b1 | Burgerzaken (paspoort, rijbewijs) | 4.1 | 5,400 | – | -25% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | b2 | Klantcontactcentrum | 4.1 | 3,800 | – | -50% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | b3 | Uitvoering belastingen | 4.1 | 5,000 | – | -25% tot +25% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.1 ('Waar gaat het geld voornamelijk naar toe') |
| ☐ | h1 | Overhead (staf, ICT, huisvesting, HR) | 4.4 | 129,180 | 5,944 | -20% tot +20% | Ontwerpbegroting 2026, financiële toelichting deelprogramma 4.4 ('Waar gaat het geld voornamelijk naar toe') |

## 5. Belastingen

| ✓ | Id | Belasting | Opbrengst | Grenzen |
| --- | --- | --- | --- | --- |
| ☐ | t1 | Onroerendezaakbelasting (OZB) | 125,300 | -30% tot +20% |
| ☐ | t5 | Parkeertarieven | 35,100 | -100% tot +20% |
| ☐ | t2 | Toeristenbelasting | 2,900 | -100% tot +100% |
| ☐ | t4 | Precariobelasting | 1,800 | -100% tot +50% |
| ☐ | t3 | Reclamebelasting | 0,700 | -100% tot +50% |

## 6. Actiekaarten

| ✓ | Id | Kaart | Bedrag | S/I | Bron |
| --- | --- | --- | --- | --- | --- |
| ☐ | k_vast | Gemeentelijk vastgoed verkopen | + 2,000 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_warm | Minderheidsbelang WarmteStad verkopen | + 4,900 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_zon | Zonnepark Meerstad-Noord niet aanleggen | + 4,000 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_wind | Windpark Roodehaan stoppen | + 1,762 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_laad | Laadpalen aan de markt laten | + 0,740 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_eiw | Stoppen met de eiwittransitie | + 0,700 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_cas | Casinolocatie aan de markt laten | + 0,600 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_kwijt | Kwijtschelding gemeentelijke belastingen schrappen | + 4,200 | S | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_ongedoc | Stoppen met opvang ongedocumenteerden | + 3,500 | S | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_brug | Bruggenfonds | − 5,000 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_fc | Trainingscomplex FC Groningen | − 2,000 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_licht | Betere straatverlichting | − 1,000 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_res | Reserves aanvullen | − 6,971 | I | VVD-tegenbegroting 2026 'Het kan en moet anders', post 'Verbeteren financiële positie van de gemeente' (6,971 mln I) |
| ☐ | k_smr | Onderzoek kleine kerncentrale (SMR) | − 0,500 | I | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_bouw | Sneller-bouwenfonds | − 5,000 | S | VVD-tegenbegroting 2026 'Het kan en moet anders' |
| ☐ | k_ai | Investeren in AI | − 2,000 | S | VVD-tegenbegroting 2026 'Het kan en moet anders' |

## 7. Aannames in de kettingeffecten

Parameters met status "aanname" of "te onderzoeken". Deze bedragen staan in de game met ⚠︎.

| Verband | Parameter | Waarde | Status | Toelichting |
| --- | --- | --- | --- | --- |
| kd_afval | aandeel_toegerekende_overhead | 0.1 | te onderzoeken | Deel van de overhead dat via de heffing wordt gedekt. Minder afvaldienst betekent minder overhead die de heffing draagt, wat de algemene middelen belast. Opvragen bij de gemeente. |
| kd_riool | factor_groen_riool | 0.1 | aanname | Zeer onzeker; alleen als verhalend effect tonen of na onderzoek met een getal. |
| kd_leges_omgeving | elasticiteit_capaciteit | 1 | aanname | Aanname: leges dalen evenredig met capaciteit. |
| kd_leges_omgeving | drempel_pct | 20 | aanname | Toegevoegd uit de formule (bij pct < -20): vanaf deze bezuiniging loopt de woningbouw vertraging op. |
| kd_bedrijfsafval | aandeel_vaste_kosten | 0.2 | te onderzoeken | Welk deel van de kosten doorloopt als de gemeente stopt. |
| kd_werkplaats | aandeel_overheadvrijval | 0.1 | te onderzoeken |  |
| kd_zwembad_tarief | elasticiteit | -0.4 | aanname | Literatuur over vrijetijdsvoorzieningen: -0,2 tot -0,6. |
| kd_schouwburg | factor_bezoekers | 0.05 | aanname | Aandeel hotelovernachtingen dat door cultuur wordt veroorzaakt. |
| rijk_buig | gem_uitkering | 0.0165 | te onderzoeken | Ca. 16.500 euro per huishouden: nagaan met het aantal bijstandshuishoudens uit de begroting. |
| rijk_buig | aantal_bijstand | null | te onderzoeken | Uit het beleidsindicatorenoverzicht van de begroting halen. |
| rijk_verdeelmodel | bedrag_per_woonruimte | null | te onderzoeken | Uit de meicirculaire gemeentefonds halen. |
| rijk_verdeelmodel | bedrag_per_inwoner | null | te onderzoeken | Idem. |
| rijk_verdeelmodel | bedrag_per_bijstandshuishouden | null | te onderzoeken | Idem. |
| rijk_accres | scenario_pct | -0.01 | aanname | Scenario, geen voorspelling. |
| wia_reintegratie | kosten_per_traject | 0.008 | aanname | Ca. 8.000 euro per traject. |
| wia_reintegratie | slagingskans | 0.3 | aanname | Duurzame uitstroom na traject. |
| wia_reintegratie | ingroei | [0.3,0.7,1] | aanname | Effect groeit in drie jaar. |
| wia_reintegratie | minima_kosten_pp | 0.0015 | aanname | Armoederegelingen, bijzondere bijstand en kwijtschelding per huishouden. |
| wia_basisbanen | terugval | 0.6 | aanname | Deel dat zonder basisbaan in de bijstand komt. |
| wia_loonkosten | terugval | 0.5 | aanname |  |
| wia_armoedeval | gevoeligheid_uitstroom | 0.02 | te onderzoeken | Wetenschappelijk omstreden: als bandbreedte tonen. |
| wia_armoedeval | gevoeligheid_schulden | 0.05 | te onderzoeken |  |
| wia_kwijtschelding | oninbaar_pct | 0.3 | aanname | Deel dat niet betaald wordt. |
| wia_kwijtschelding | extra_invorderingskosten | 0.3 | aanname |  |
| wia_tegenprestatie | kosten_pp | 0.001 | aanname |  |
| wia_tegenprestatie | extra_uitstroom | 0.03 | te onderzoeken |  |
| wia_inburgering | verkorting_jaren | 0.5 | aanname |  |
| zp_schuldhulp | a_bijzbijstand | 0.25 | aanname | Waarde uit de game. |
| zp_schuldhulp | a_opvang | 0.1 | aanname |  |
| zp_schuldhulp | a_jeugd | 0.1 | aanname |  |
| zp_schuldhulp | a_wij | 0.05 | aanname |  |
| zp_preventie_jeugd | factor_escalatie | 0.3 | aanname | Bewijs wisselt per interventie: als bandbreedte 0,1 tot 0,5 tonen. |
| zp_preventie_jeugd | ingroei | [0,0.5,1] | aanname |  |
| zp_preventie_wmo | factor | 0.2 | aanname |  |
| zp_preventie_wmo | ingroei | [0,0.5,1] | aanname |  |
| zp_beschermd_opvang | factor_overlast | 0.1 | aanname |  |
| zp_ongedocumenteerden | aandeel_restkosten | 0.2 | te onderzoeken |  |
| vh_parkeerhandhaving | betaalbereidheid | 0.1 | aanname | Hoeveel parkeeropbrengst verdwijnt bij 100% minder controle. |
| vh_camera_verlichting | afschrijvingstermijn | 10 | aanname |  |
| vh_graffiti_onderhoud | koppeling | 0.3 | aanname |  |
| or_achterstallig | factor_achterstallig | 1.5 | aanname | Vakliteratuur (CROW) noemt forse meerkosten; bandbreedte 1,2 tot 2,0. |
| or_areaal | onderhoud_per_woning | 0.0005 | aanname |  |
| ec_parkeren_elasticiteit | elasticiteit | -0.3 | aanname | Literatuur: -0,1 tot -0,6. |
| ec_parkeren_elasticiteit | factor_binnenstad | 10 | aanname |  |
| ec_toerisme_cultuur | factor | 0.2 | aanname |  |
| ec_ozb_nietwoningen | verdeling | null | te onderzoeken | Uit de paragraaf lokale heffingen van de begroting halen. |
| ec_strategisch_bezit | boekwaarde | null | te onderzoeken | Per pand opvragen. |
| wg_woningbouw | ozb_per_woning | null | te onderzoeken | Niet nodig zolang tarieven-JJJJ.json er is: de game rekent dan met het OZB-tarief voor woningen x de gemiddelde WOZ-waarde uit de kerngegevens (2026: 0,1473% x 340.000 = 501 euro), met de OZB-keuze van de speler. Eerder stond hier 0,0003 (300 euro) als aanname. |
| wg_woningbouw | extra_woningen_per_mln_fonds | 20 | aanname |  |
| wg_verduurzaming | rendement | 0.08 | aanname |  |
| en_opwek | gemiste_opbrengst | null | te onderzoeken | Uit de businesscase halen. |
| org_frictie | verloop_pct | 0.05 | aanname | Natuurlijk verloop bij gemeenten: 4 tot 7%. |
| org_frictie | frictie_factor | 1 | aanname |  |
| org_frictie | personeelskosten | null | te onderzoeken | Uit het overzicht van de gemeentelijke organisatie halen. |
| org_capaciteit | factor_tempo | 0.5 | aanname | Toegevoegd uit de formule (tempo_projecten *= 1 + 0,5 * pct_apparaat/100), zodat de rekenmotor het getal uit de data leest. |
| org_ai | rendement | 0.5 | aanname |  |
| org_ai | ingroei | [0,0.3,0.7,1] | aanname |  |
| fin_kapitaallasten | levensduur_gebouw | 40 | aanname | Afschrijvingsbeleid gemeente nagaan. |
| fin_kapitaallasten | levensduur_brug | 50 | aanname |  |
| fin_kapitaallasten | rente | 0.025 | aanname | Omslagrente uit de begroting. |
| fin_reserves | ondergrens_ratio | 1 | aanname | Toegevoegd uit het mechanisme: een weerstandsvermogen onder 100% is een waarschuwingssignaal. Spelregel. |
| jur_subsidies | ingroei | [0.25,1] | aanname |  |

## 8. Gebeurteniskaarten (campagne)

Percentage van een bedrag uit de begroting. Het percentage is een scenario.

| Kaart | S/I | Basis | Percentage (laag / midden / hoog) | Bedrag (midden) |
| --- | --- | --- | --- | --- |
| Meer vraag naar jeugdzorg | S | lasten z1 (118,800) | 2% / 4% / 7% | − 4,752 |
| Nieuwe cao voor ambtenaren | S | lasten h1, e2, e10, m11, w4 (146,580) | 1% / 2% / 3,5% | − 2,932 |
| Een strenge winter | I | lasten o1 (66,400) | 1% / 2% / 3,5% | − 1,328 |
| Een meevallende meicirculaire | S | gemeentefonds (825,768) | 0,25% / 0,5% / 1% | + 4,129 |
| Het Rijk kort op het gemeentefonds | S | gemeentefonds (825,768) | 0,5% / 1% / 2% | − 8,258 |
| Extra kosten voor aardbevingsversterking | I | lasten d1 (19,800) | 3% / 5% / 10% | − 0,990 |
| Extra rijksgeld via Nij Begun | I | lasten g4 (8,150) | 10% / 20% / 30% | + 1,630 |
| Hogere energieprijzen | S | lasten k1 (36,500) | 1,5% / 3% / 6% | − 1,095 |
| Een hogere rente | S | lasten e11, m10 (16,800) | 3% / 5% / 10% | − 0,840 |
| Een zorgaanbieder gaat failliet | I | lasten z3 (64,700) | 0,5% / 1% / 2% | − 0,647 |
| Een groot evenement komt naar Groningen | I | opbrengst t2 (2,900) | 5% / 10% / 20% | + 0,290 |
| Een groot evenement komt naar Groningen | I | lasten v3 (3,800) | 5% / 10% / 15% | − 0,380 |
| Een brug moet sneller vervangen worden | S | lasten m10 (6,100) | 2% / 4% / 6% | − 0,244 |
| Meer statushouders | S | lasten s7, z11 (5,958) | 5% / 10% / 15% | − 0,596 |
| De bouwkosten stijgen | S | lasten d1 (19,800) | 2% / 3% / 5% | − 0,594 |
| Een rechterlijke uitspraak over de Wmo | S | lasten z3 (64,700) | 2% / 3% / 5% | − 1,941 |

## 9. Tarieven (te controleren)

Bron: [Gemeente Groningen, raadsvoorstel Belastingtarieven 2026](https://gemeenteraad.groningen.nl/Documenten/Belastingtarieven-2026.pdf).

| ✓ | Tarief | Bedrag |
| --- | --- | --- |
| ☐ | OZB woningen, eigenaar | 0,147% van de WOZ-waarde |
| ☐ | Afvalstoffenheffing, 1 persoon | € 283,08 |
| ☐ | Afvalstoffenheffing, 2 personen | € 331,2 |
| ☐ | Afvalstoffenheffing, 3 of meer | € 402,12 |
| ☐ | Rioolheffing, eigenaar | € 178,69 |

## 10. Parkeren per vergunning en zone

De schuif Parkeertarieven (35,100 mln) is verdeeld in posten. Samen: 35,100 mln. Vergunningen: aantal × tarief. Kortparkeren: de parkeerbelasting uit de kerngegevens min de vergunningen. Garages: de rest.

Bronnen: [Voortgang pakket parkeermaatregelen, technisch rapport (september 2025)](https://gemeenteraad.groningen.nl/Documenten/Bijlage-Voortgang-pakket-parkeermaatregelen-technisch-rapport.pdf) (2025-09, feit); [Gemeente Groningen, raadsvoorstel Belastingtarieven 2026 (via zoekresultaten, document zelf nog niet ingezien)](https://gemeenteraad.groningen.nl/Documenten/Belastingtarieven-2026.pdf) (2025-11, te controleren); [Ontwerpbegroting 2026 (kerngegevens en schuif t5)](https://gemeenteraad.groningen.nl/Documenten/Bijlage-2-Ontwerpbegroting-2026-boekwerk.pdf) (2025-09, feit).

| ✓ | Post | Tarief (bron, jaar) | Aantal (jaar) | Opbrengst (mln) | Status |
| --- | --- | --- | --- | --- | --- |
| ☐ | Bewonersvergunning (binnenstad) | € 394,20 (2026) | 765 (2025) | 0,302 | ⚠︎ aanname |
| ☐ | Bewonersvergunning (tweede zone) | € 135,05 (2026) | 9.275 (2025) | 1,253 | ⚠︎ aanname |
| ☐ | Bewonersvergunning (derde tot en met vijfde zone) | € 62,05 (2026) | 17.710 (2025) | 1,099 | ⚠︎ aanname |
| ☐ | Tweede bewonersvergunning (tweede zone) | € 408,80 (2026) | 336 (2025) | 0,137 | ⚠︎ aanname |
| ☐ | Bezoekersvergunning | € 25,00 (2026) | 24.621 (2025) | 0,616 | ⚠︎ aanname |
| ☐ | Bedrijfsvergunning | € 135,05 (2026) | 2.215 (2025) | 0,299 | ⚠︎ aanname |
| ☐ | Mantelzorgvergunning | € 26,02 (2026) | 247 (2025) | 0,006 | ⚠︎ aanname |
| ☐ | Maatschappelijke parkeervergunning | € 65,70 (2026) | 110 (2025) | 0,007 | feit |
| ☐ | Kortparkeren (uurtarief) en overige parkeerbelasting | afgeleid |  | 22,606 | ⚠︎ aanname |
| ☐ | Parkeergarages | afgeleid |  | 8,775 | ⚠︎ aanname |

Uurtarieven kortparkeren (alleen ter informatie; de game heeft één schuif voor kortparkeren):

| ✓ | Zone | Uurtarief (jaar) |
| --- | --- | --- |
| ☐ | Zone 1 (binnenstad) | € 5,00 (2026) |
| ☐ | Zone 2 (onder andere Oosterpoort, Schildersbuurt, Korrewegwijk, Haren Centrum) | € 4,50 (2026) |
| ☐ | Zone 3 (onder andere Paddepoel, Selwerd, Helpman, De Linie) | € 2,70 (2023) |
| ☐ | Zone 4 (Hoornse Meer, De Wijert-Zuid, Stadspark, Oosterhoogebrug) | € 2,70 (2023) |
| ☐ | Zone 5 (Haren Schil, alleen voor vergunninghouders) | onbekend |
