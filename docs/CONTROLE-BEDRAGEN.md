# Controle van alle bedragen (begroting 2027)

Gemaakt met `npm run bedragen:controle` op 2026-10-03. Dit bestand wordt
elke keer opnieuw gemaakt; zet vinkjes en opmerkingen dus in een kopie, of in BEVINDINGEN.md.

Bedragen in miljoenen euro's, tenzij anders vermeld. Bron: [Ontwerpbegroting 2027 gemeente Groningen (boekwerk)](https://gemeenteraad.groningen.nl/).

## 1. Automatische controles

- `data:check`: **0 fouten, 19 waarschuwingen** ✓

| Controle | Uitkomst | Toelichting |
| --- | --- | --- |
| OZB (schuif t1) en kengetal OZB | ✓ klopt | 139,441 tegenover 139,441 mln |
| Toeristenbelasting (t2) en kengetal logiesbelasting | ✓ klopt | 2,998 tegenover 2,998 mln |
| Reclamebelasting (t3) en kengetal | ✓ klopt | 0,980 tegenover 0,980 mln |
| Precariobelasting (t4) en kengetal | ✓ klopt | 1,866 tegenover 1,866 mln |
| Parkeerposten samen en schuif t5 | ✓ klopt | 36,299 tegenover 36,299 mln |
| Parkeerposten zonder garages en kengetal parkeerbelasting | ✓ klopt | 27,524 tegenover 27,524 mln |
| Zonder keuzes is het saldo in elk jaar € 0 | ✓ klopt | het saldo telt ten opzichte van de begroting |

```
⚠︎ [deelprogramma] De onderdelen van 2.1 (Kwaliteit leefomgeving) tellen op tot 152.200 mln; het deelprogramma heeft 150.898 mln lasten in 2027. (bekende afwijking)
⚠︎ [deelprogramma] De gekoppelde baten van 3.4 tellen op tot 12.100 mln; het deelprogramma heeft 12.096 mln baten.
⚠︎ [onderdelen] e7: staat op "controleren".
⚠︎ [onderdelen] w12: staat op "controleren".
⚠︎ [onderdelen] o4: staat op "controleren".
⚠︎ [onderdelen] o6: staat op "controleren".
⚠︎ [onderdelen] c2: staat op "controleren".
⚠︎ [onderdelen] c3: staat op "controleren".
⚠︎ [onderdelen] c5: staat op "controleren".
⚠︎ [onderdelen] g2: staat op "controleren".
⚠︎ [totalen] 2028: de baten van de deelprogramma's (1586047) wijken 2 (x € 1.000) af van de totalen inclusief reservemutaties (1586049). Dat past bij afronding.
⚠︎ [totalen] 2029: de lasten van de deelprogramma's (1595663) wijken 81 (x € 1.000) af van de totalen inclusief reservemutaties (1595582). (bekende afwijking: In het boekwerk zelf (p. 352-353) zijn de deelprogramma's samen 81 duizend euro hoger dan de regel 'Lasten totaal' en 'Baten totaal'. Het saldo is gelijk; het verschil staat zo in de begroting.)
⚠︎ [totalen] 2029: de baten van de deelprogramma's (1587837) wijken 80 (x € 1.000) af van de totalen inclusief reservemutaties (1587757). (bekende afwijking: In het boekwerk zelf (p. 352-353) zijn de deelprogramma's samen 81 duizend euro hoger dan de regel 'Lasten totaal' en 'Baten totaal'. Het saldo is gelijk; het verschil staat zo in de begroting.)
⚠︎ [totalen] 2030: de lasten van de deelprogramma's (1641269) wijken 82 (x € 1.000) af van de totalen inclusief reservemutaties (1641187). (bekende afwijking: In het boekwerk zelf (p. 352-353) zijn de deelprogramma's samen 81 duizend euro hoger dan de regel 'Lasten totaal' en 'Baten totaal'. Het saldo is gelijk; het verschil staat zo in de begroting.)
⚠︎ [totalen] 2030: de baten van de deelprogramma's (1631139) wijken 81 (x € 1.000) af van de totalen inclusief reservemutaties (1631058). (bekende afwijking: In het boekwerk zelf (p. 352-353) zijn de deelprogramma's samen 81 duizend euro hoger dan de regel 'Lasten totaal' en 'Baten totaal'. Het saldo is gelijk; het verschil staat zo in de begroting.)
⚠︎ [parkeren] Uurtarief Zone 3 (onder andere Paddepoel, Selwerd, Helpman, De Linie): tarief van 2023 en geen indexatie naar 2027. Vervang het tarief of vul "indexatie" aan.
⚠︎ [parkeren] Uurtarief Zone 4 (Hoornse Meer, De Wijert-Zuid, Stadspark, Oosterhoogebrug): tarief van 2023 en geen indexatie naar 2027. Vervang het tarief of vul "indexatie" aan.
⚠︎ [parkeren] De aantallen vergunningen zijn van 2025; er zijn nieuwere cijfers nodig voor 2027.
⚠︎ [parkeren] bedrijven: de gebieden tellen op tot 2215, de bron noemt 2216 (verschil -1).

0 fouten, 19 waarschuwingen, 0 meldingen.
```

## 2. Totalen en kengetallen

| Wat | 2027 | 2028 | 2029 | 2030 | Bron |
| --- | --- | --- | --- | --- | --- |
| Lasten (excl. reserves) | 1.585,643 | 1.557,302 | 1.573,318 | 1.621,629 | boekwerk p. 353 |
| Baten (excl. reserves) | 1.562,953 | 1.553,000 | 1.575,050 | 1.626,032 | boekwerk p. 353 |

| Kengetal | Waarde | Bron |
| --- | --- | --- |
| gemeentefonds_x1000 | 868.652 | boekwerk p. 5 (kerngegevens) |
| opbrengst_belastingen_totaal_x1000 | 172.964 | boekwerk p. 5 (kerngegevens) |
| ozb_x1000 | 139.441 | boekwerk p. 5 (kerngegevens) |
| algemene_reserve_x1000 | 86.532 | boekwerk p. 5 (kerngegevens) |
| ratio_weerstandsvermogen | 1,52 | boekwerk p. 5 (kerngegevens) |
| aantal_woningen | 127.816 | boekwerk p. 5 (kerngegevens) |
| gemiddelde_woz | 360.000 | boekwerk p. 5 (kerngegevens) |
| parkeerbelasting_x1000 | 27.524 | boekwerk p. 5 (kerngegevens) |
| reclamebelasting_x1000 | 980 | boekwerk p. 5 (kerngegevens) |
| logiesbelasting_x1000 | 2.998 | boekwerk p. 5 (kerngegevens) |
| precariobelasting_x1000 | 1.866 | boekwerk p. 5 (kerngegevens) |
| roerende_zaakbelasting_x1000 | 155 | boekwerk p. 5 (kerngegevens) |

## 3. Deelprogramma's

| Code | Naam | Lasten 2027 | Baten 2027 | Som van de posten (lasten) | Bron |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Economie en werkgelegenheid | 54,749 | 15,517 | 41,150 | boekwerk p. 351-352 |
| 1.2 | Mobiliteit | 61,193 | 45,948 | 28,708 | boekwerk p. 351-352 |
| 1.3 | Wonen | 50,773 | 21,358 | 38,375 | boekwerk p. 351-352 |
| 2.1 | Kwaliteit leefomgeving | 150,898 | 87,594 | 152,200 | boekwerk p. 351-352 |
| 2.2 | Veiligheid | 52,196 | 7,042 | 46,600 | boekwerk p. 351-352 |
| 3.1 | Werk en inkomen | 355,432 | 232,936 | 350,800 | boekwerk p. 351-352 |
| 3.2 | Onderwijs | 59,593 | 26,150 | 43,700 | boekwerk p. 351-352 |
| 3.3 | Welzijn, gezondheid, zorg en diversiteit | 456,414 | 46,895 | 409,900 | boekwerk p. 351-352 |
| 3.4 | Sport en bewegen | 44,170 | 12,096 | 41,200 | boekwerk p. 351-352 |
| 3.5 | Cultuur en evenementen | 89,722 | 27,486 | 83,300 | boekwerk p. 351-352 |
| 4.1 | Dienstverlening | 21,782 | 6,339 | 14,900 | boekwerk p. 351-352 |
| 4.2 | College, raad, wijkontwikkeling en wijkvernieuwing | 66,004 | 56,399 | 25,150 | boekwerk p. 351-352 |
| 4.3 | Algemene inkomsten en post onvoorzien | 3,786 | 1.020,282 | – | boekwerk p. 351-352 |
| 4.4 | Overhead en ondersteuning organisatie | 147,205 | 7,875 | 134,900 | boekwerk p. 351-352 |

## 4. Posten (schuiven)

Lasten en meebewegende baten per post. ✓ = gecontroleerd tegen het boekwerk (in te vullen).

| ✓ | Id | Post | Dp. | Lasten | Baten | Grenzen | Bron |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ☐ | e1 | Economische agenda | 1.1 | 1,400 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Economische Agenda 1.400 |
| ☐ | e2 | Ambtenaren economische zaken | 1.1 | 3,200 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Personele inzet economische ontwikkeling 3.200 |
| ☐ | e3 | Citymarketing en economische activiteiten | 1.1 | 2,250 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Reguliere activiteiten economische ontwikkeling 2.250 |
| ☐ | e4 | Akkoord van Groningen (RUG, Hanze, UMCG) | 1.1 | 1,250 | 0,750 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Akkoord van Groningen 1.250 / 750 |
| ☐ | e5 | Markten, havens en brugbediening | 1.1 | 2,800 | 1,300 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Markt- en havenwezen 2.800 / 1.300 |
| ☐ | e6 | Bedrijventerreinen en winkelcentra | 1.1 | 1,550 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Intensiveringsmiddelen Ruimtelijke economie 1.550 |
| ☐ | e7 | Strategisch bezit (panden en grond) | 1.1 | 4,700 | 4,300 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Strategisch bezit 4.700 / 4.300 |
| ☐ | e8 | Suikerzijde (gebiedsontwikkeling) | 1.1 | 4,300 | – | -65% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Suikerzijde 4.300 |
| ☐ | e9 | Regio Groningen-Assen | 1.1 | 1,100 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Bijdrage aan Regio Groningen-Assen 1.100 |
| ☐ | e10 | Ambtenaren gebiedsontwikkeling | 1.1 | 7,100 | 0,100 | -75% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Personele inzet en bedrijfsvoering Stadsontwikkeling 7.100 / 100 |
| ☐ | e11 | Rente en afschrijving (o.a. Meerstad) | 1.1 | 11,500 | – | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.1 ('Waar gaat het geld voornamelijk naar toe'), p. 23: Kapitaallasten ruimtelijk-economische projecten/activa 7.500 + Kapitaallasten bovenwijkse voorzieningen Meerstad 4.000 |
| ☐ | m2 | Parkeercontrole | 1.2 | 7,300 | 6,300 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: Parkeerhandhaving |
| ☐ | m3 | Extra geld mobiliteit | 1.2 | 5,570 | – | -50% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: Intensiveringsmiddelen Mobiliteit |
| ☐ | m4 | Uitvoering mobiliteitsvisie | 1.2 | 1,560 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: Uitvoeringsprogramma's Mobiliteitsvisie |
| ☐ | m5 | Fietsenstallingen centrum | 1.2 | 1,000 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: Stallingen centrum |
| ☐ | m6 | Binnenstadsprogramma | 1.2 | 2,240 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: SIF-middelen voor projecten - Binnenstadsprogramma |
| ☐ | m7 | Stationsgebied | 1.2 | 0,988 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: SIF-middelen voor projecten - Stationsgebied |
| ☐ | m9 | Oosterhamrikzone | 1.2 | 0,250 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: SIF-middelen voor projecten - Oosterhamrikzone |
| ☐ | m11 | Ambtenaren mobiliteit | 1.2 | 3,300 | – | -75% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: Personele inzet programma Mobiliteit |
| ☐ | m10 | Rente en afschrijving wegen | 1.2 | 6,500 | – | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.2 ('Waar gaat het geld voornamelijk naar toe'), p. 35: Kapitaallasten |
| ☐ | w1 | Extra geld wonen | 1.3 | 1,775 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 44: Intensiveringsmiddelen Wonen (1.775) |
| ☐ | w2 | Meer betaalbare woningen | 1.3 | 1,200 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 44: Meer betaalbare woningen (1.200) |
| ☐ | w3 | Goed verhuurderschap | 1.3 | 0,900 | 0,500 | -80% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 44: Woontoezicht (900 / 500) |
| ☐ | w4 | Ambtenaren wonen | 1.3 | 4,900 | – | -75% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 44: Personele inzet programma Wonen (4.900) |
| ☐ | w6 | Energiesubsidies | 1.3 | 4,300 | 3,300 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 45: Diverse subsidies programma Energie (4.300 / 3.300) |
| ☐ | w7 | Extra geld energietransitie | 1.3 | 2,300 | – | -90% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 45: Intensiveringsmiddelen Energie (2.300) |
| ☐ | w8 | Omgevingsvergunningen | 1.3 | 9,000 | 16,500 | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 45: Leges omgevingsvergunning (9.000 / 16.500) |
| ☐ | w10 | Toezicht op bouwen | 1.3 | 2,000 | – | -60% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 45: Toezicht en handhaving (2.000) |
| ☐ | w11 | Verduurzamen gemeentegebouwen | 1.3 | 1,100 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3 ('Waar gaat het geld voornamelijk naar toe'), p. 44: Verduurzaming maatschappelijk vastgoed (1.100) |
| ☐ | w12 | Klimaat- en energiebeleid (CDOKE) | 1.3 | 10,900 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 1.3, p. 45: Capaciteit decentrale overheden klimaat- en energiebeleid (CDOKE) 10.900 |
| ☐ | o1 | Onderhoud straten, groen en speeltuinen | 2.1 | 72,400 | 2,100 | -50% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe'), p. 61: Onderhoud en beheer openbare ruimte 72.400 / 2.100 |
| ☐ | o3 | Afvalinzameling huishoudens | 2.1 | 39,700 | 45,000 | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe'), p. 62: Afvalstoffenheffing 39.700 / 45.000 |
| ☐ | o2 | Riolering | 2.1 | 24,400 | 25,800 | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe'), p. 61: Rioolheffing 24.400 / 25.800 |
| ☐ | o4 | Zakelijke dienstverlening (bedrijfsafval, werkplaats) | 2.1 | 9,900 | 11,100 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe'), p. 62: Zakelijke dienstverlening Stadsbeheer 9.900 / 11.100 |
| ☐ | o6 | Leefkwaliteit (groen en spelen in wijken) | 2.1 | 4,000 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe'), p. 62: Meerjarenprogramma Leefkwaliteit 3.200 / 0 + Bodembeheer 800 / 0 |
| ☐ | o8 | Geo en data | 2.1 | 1,800 | – | -50% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.1 ('Waar gaat het geld voornamelijk naar toe'), p. 63: GEO & Data 1.800 / 0 |
| ☐ | v2 | Boa's en toezicht op straat | 2.2 | 3,700 | – | -90% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 72: Toezicht en handhaving in de openbare ruimte 3.700 / - |
| ☐ | v3 | Openbare orde en veiligheid | 2.2 | 5,700 | – | -75% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 72: Openbare orde en veiligheid (OOV) 5.700 / - |
| ☐ | v4 | Ondermijning (drugs en criminele geldstromen) | 2.2 | 1,400 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 71: Ondermijning 1.400 / - |
| ☐ | v5 | Jeugd en veiligheid | 2.2 | 4,300 | 1,500 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 71: Jeugd en Veiligheid 4.300 / 1.500 |
| ☐ | v6 | Zorg- en Veiligheidshuis | 2.2 | 2,300 | 1,300 | -90% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 71: Zorg- en Veiligheidshuis Groningen 2.300 / 1.300 |
| ☐ | v9 | Reclamezuilen op straat | 2.2 | 0,500 | 1,500 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 72: Reclamedragend straatmeubilair 500 / 1.500 |
| ☐ | v1 | Brandweer en ambulancezorg (Veiligheidsregio) | 2.2 | 26,900 | – | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 72: Veiligheidsregio Groningen 26.900 / - |
| ☐ | v8 | Omgevingsdienst | 2.2 | 1,800 | – | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 2.2 ('Waar gaat het geld voornamelijk naar toe'), p. 72: Deelnemersbijdrage Omgevingsdienst 1.800 / - |
| ☐ | s3 | Begeleiding naar werk | 3.1 | 23,800 | – | -70% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 89: Participatie en re-integratie |
| ☐ | s1 | Bijstandsuitkeringen | 3.1 | 205,100 | 194,400 | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 90: BUIG |
| ☐ | s2 | Sociale werkvoorziening (Iederz) | 3.1 | 40,000 | 5,700 | -10% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 89: Sociale Werkvoorziening en Nieuw Beschut |
| ☐ | s4 | Loonkostensubsidie | 3.1 | 13,400 | 13,100 | 🔒 vast | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 90: Loonkostensubsidie |
| ☐ | s5 | Werk in Zicht | 3.1 | 11,600 | 9,800 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 90: Werk in Zicht |
| ☐ | s6 | Basisbanen | 3.1 | 9,400 | 2,700 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 90: Basisbanen |
| ☐ | s8 | Afspraakbanen | 3.1 | 3,600 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 90: Afspraakbanen |
| ☐ | s9 | Schuldhulpverlening | 3.1 | 11,600 | 0,700 | -60% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 91: Schuldhulpverlening |
| ☐ | s10 | Armoede- en minimaregelingen | 3.1 | 15,500 | 1,600 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 91: Armoede- en minimaregelingen |
| ☐ | s11 | Bijzondere bijstand | 3.1 | 5,900 | 0,460 | -25% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 91: Bijzondere bijstand |
| ☐ | s12 | Individuele inkomenstoeslag | 3.1 | 4,200 | – | -75% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 91: Individuele inkomenstoeslag |
| ☐ | s7 | Inburgering | 3.1 | 6,700 | 3,500 | -20% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.1 ('Waar gaat het geld voornamelijk naar toe'), p. 90: Inburgering |
| ☐ | z1 | Jeugdzorg | 3.3 | 127,700 | 1,800 | -20% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 120: Jeugd |
| ☐ | z2 | Beschermd wonen | 3.3 | 88,100 | 1,400 | -15% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 120: Beschermd Wonen |
| ☐ | z3 | Wmo (huishoudelijke hulp, hulpmiddelen) | 3.3 | 70,800 | 2,000 | -20% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 120: WMO |
| ☐ | z4 | WIJ-teams in de wijk | 3.3 | 46,300 | – | -60% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 121: WIJ |
| ☐ | z5 | Daklozen- en vrouwenopvang | 3.3 | 34,200 | 6,000 | -25% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 121: Maatschappelijke opvang en Vrouwenopvang |
| ☐ | z6 | Gezondheid (GGD) | 3.3 | 12,000 | – | -30% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 121: Gezondheidszorg |
| ☐ | z7 | Huiselijk geweld en kindermishandeling | 3.3 | 11,900 | 7,300 | -20% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 121: Huiselijk geweld en kindermishandeling |
| ☐ | z8 | Welzijnsinstellingen en buurthuizen | 3.3 | 8,700 | 0,246 | -95% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 122: Sociaal-culturele en welzijnsinstellingen |
| ☐ | z9 | Sociale samenhang in wijken | 3.3 | 7,600 | 0,500 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 122: Bevorderen sociale samenhang en leefbaarheid |
| ☐ | z10 | Diversiteit en inclusie | 3.3 | 1,400 | – | -85% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 123: Diversiteit en inclusie |
| ☐ | z11 | Opvang vluchtelingen en asielzoekers | 3.3 | 1,200 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.3 ('Waar gaat het geld voornamelijk naar toe'), p. 123: Opvang vluchtelingen en asielzoekers |
| ☐ | d1 | Schoolgebouwen | 3.2 | 22,600 | 4,400 | -20% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe'), p. 100: Onderwijshuisvesting (22.600 / 4.400) |
| ☐ | d2 | Onderwijskansen | 3.2 | 12,400 | 4,700 | -40% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe'), p. 100: Onderwijskansen (12.400 / 4.700) |
| ☐ | d4 | Voortijdig schoolverlaten | 3.2 | 4,400 | 2,400 | -40% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe'), p. 100: Voortijdig schoolverlaten (VSV) (4.400 / 2.400) |
| ☐ | d5 | Leerlingenvervoer | 3.2 | 2,900 | – | -10% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe'), p. 101: Leerlingenvervoer (2.900 / -) |
| ☐ | d6 | Natuur- en duurzaamheidseducatie | 3.2 | 1,400 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.2 ('Waar gaat het geld voornamelijk naar toe'), p. 101: Natuur- en duurzaamheidseducatie (1.400 / -) |
| ☐ | k1 | Sporthallen, zwembaden en ijsbaan | 3.4 | 39,400 | 12,100 | -40% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.4 ('Waar gaat het geld voornamelijk naar toe'), p. 129: Sportaccommodaties en zwemvoorzieningen (39.400 / 12.100) |
| ☐ | k2 | Sportstimulering | 3.4 | 1,800 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.4 ('Waar gaat het geld voornamelijk naar toe'), p. 129: Sportstimulering, talentontwikkeling en participatie (1.800 / -) |
| ☐ | c1 | Stadsschouwburg en Oosterpoort | 3.5 | 28,900 | 18,200 | -90% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe'), p. 139: Stadsschouwburg en Oosterpoort (SPOT) 28.900 / 18.200 |
| ☐ | c2 | Culturele instellingen en subsidies | 3.5 | 29,000 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe'), p. 139: Cultuurnota 29.000 / 0 |
| ☐ | c3 | Cultuur- en evenementenbeleid (o.a. bibliotheek, media, evenementen) | 3.5 | 10,500 | 0,500 | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe'), p. 139: Cultuur- en evenementenbeleid 10.500 / 500 |
| ☐ | c4 | Groninger Archieven | 3.5 | 3,400 | – | -25% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.5 ('Waar gaat het geld voornamelijk naar toe'), p. 139: Groninger Archieven 3.400 / 0 |
| ☐ | c5 | Cultureel vastgoed (Martiniplaza, Forum, Oosterpoort) | 3.5 | 11,500 | 8,100 | -25% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 3.5, p. 139: Cultureel vastgoed en ontwikkeling 11.500 / 8.100 |
| ☐ | g1 | College van burgemeester en wethouders | 4.2 | 2,400 | – | -64% tot +12.5% | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe'), p. 151: College van B&W 2.400 |
| ☐ | g2 | Gemeenteraad en griffie | 4.2 | 4,350 | – | -43% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe'), p. 151: Raad 2.800 + Griffie 1.300 + Rekenkamer 250 |
| ☐ | g3 | Wijkbudgetten | 4.2 | 4,250 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe'), p. 151: Wijkontwikkeling 4.250 |
| ☐ | g4 | Wijkvernieuwing (o.a. Selwerd, De Wijert, Beijum) | 4.2 | 6,150 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe'), p. 151: Wijkvernieuwing 6.150 |
| ☐ | g5 | Samenwerkingsverbanden | 4.2 | 2,100 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe'), p. 151: Deelname aan diverse samenwerkingsverbanden 2.100 |
| ☐ | g7 | Concernposten | 4.2 | 5,900 | – | -100% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.2 ('Waar gaat het geld voornamelijk naar toe'), p. 151: Concernposten 5.900 |
| ☐ | b1 | Burgerzaken (paspoort, rijbewijs) | 4.1 | 5,900 | – | -25% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.1 ('Waar gaat het geld voornamelijk naar toe'), p. 147: Burgerzaken |
| ☐ | b2 | Klantcontactcentrum | 4.1 | 4,100 | – | -75% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.1 ('Waar gaat het geld voornamelijk naar toe'), p. 147: Klant Contactcentrum (KCC) |
| ☐ | b3 | Uitvoering belastingen | 4.1 | 4,900 | – | -25% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.1 ('Waar gaat het geld voornamelijk naar toe'), p. 147: Belastingen |
| ☐ | h1 | Overhead (staf, ICT, huisvesting, HR) | 4.4 | 134,900 | 3,400 | -40% tot geen maximum | Ontwerpbegroting 2027, financiële toelichting deelprogramma 4.4 ('Waar gaat het geld voornamelijk naar toe'), p. 156: Overhead |

## 5. Belastingen

| ✓ | Id | Belasting | Opbrengst | Grenzen |
| --- | --- | --- | --- | --- |
| ☐ | t1 | Onroerendezaakbelasting (OZB) | 139,441 | -100% tot geen maximum |
| ☐ | t5 | Parkeertarieven | 36,299 | -100% tot geen maximum |
| ☐ | t2 | Toeristenbelasting | 2,998 | -100% tot geen maximum |
| ☐ | t4 | Precariobelasting | 1,866 | -100% tot geen maximum |
| ☐ | t3 | Reclamebelasting | 0,980 | -100% tot geen maximum |

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
| ☐ | k_hond | Hondenbelasting weer invoeren | + 1,015 | S | Opbrengst 2021 (€ 1,015 mln) en tarief (€ 133 per hond): RTV Noord, 6 juli 2021, en de raadsbrief over de afschaffing. Bedrag van 2021, niet geïndexeerd; het aantal honden kan veranderd zijn. |
| ☐ | p_young_professionals | Stoppen met het Young Professional Programma | + 0,678 | S | https://groningen.begroting-2026.nl/p43761 (deelprogramma 4.2 Financiën, 'Waar gaat het geld voornamelijk naar toe': Young Professional Programma 678) |
| ☐ | p_ombudsman | Eigen ombudsman stoppen, naar de Nationale ombudsman | + 0,535 | S | https://groningen.begroting-2026.nl/p43761 (deelprogramma 4.2 Financiën: Ombudsman 535); Gemeentewet art. 81p (https://wetten.overheid.nl/BWBR0005416/2026-01-01); Awb art. 9:17 (https://wetten.overheid.nl/BWBR0005537/2026-01-01) |
| ☐ | p_diversiteit_organisatie | Stoppen met het diversiteitsplan voor eigen personeel | + 0,205 | I | https://groningen.begroting-2026.nl/p43767 (4.4 Financiën, intensivering 58 'Uitvoering plan van aanpak diversiteit' 205 I) en https://groningen.begroting-2026.nl/p43769 (toelichting intensivering 58) |
| ☐ | p_internationale_solidariteit | Stoppen met het budget internationale solidariteit | + 0,050 | S | https://groningen.begroting-2026.nl/p43728 (1.1 Financiën, tabel intensiveringen en dekkingsbronnen: 'Amendement Internationale solidariteit 50 S') |
| ☐ | p_fonds_ondernemend | Bijdrage aan Fonds Ondernemend Groningen stoppen | + 3,343 | S | https://groningen.begroting-2026.nl/p43764 (4.3 Financiën, regel Onroerendezaakbelasting: lasten 3.343, 'De lasten bestaan uit de bijdrage aan het Fonds Ondernemend Groningen is 3,3 miljoen euro') |
| ☐ | p_mobiliteitsfonds | Niet meer sparen in het Mobiliteitsfonds | + 4,000 | S | https://groningen.begroting-2026.nl/p43731 (1.2 Financiën: tabel 'Financieel overzicht lasten en baten', reservemutaties 'Totaal toevoegingen 4.000' in 2026, 2027, 2028 en 2029; tabel 'Intensiveringen en dekkingsbronnen', 'Reserve Mobiliteitsfonds 4.000 I'); https://groningen.begroting-2026.nl/p43708 (Reserves, 'Mobiliteitsfonds') |
| ☐ | p_campus_camera | Geen geld voor Campus Camera | + 0,100 | S | https://groningen.begroting-2026.nl/p43728 (1.1 Financiën, intensivering 3 'Huisvesting onderwijs en cultuur in Camera-bioscoop 100 S'); https://groningen.begroting-2026.nl/p43769 (Intensiveringen, punt 3: -100 in 2026 t/m 2029) |
| ☐ | p_bag_kamers | Geen extra controleur voor illegale kamers | + 0,060 | I | https://groningen.begroting-2026.nl/p43734 (1.3 Financiën, intensivering 5 'Toezichthouder BAG meldingen 50 I'); https://groningen.begroting-2026.nl/p43769 (Intensiveringen, punt 5: -50 en overhead -10 in 2026 en 2027) |
| ☐ | p_emissieloos_wagenpark | Elektrisch maken van gemeenteauto's uitstellen | + 0,172 | S | https://groningen.begroting-2026.nl/p43769 (Intensiveringen begroting 2026, nr. 9 'Emissieloos wagenpark', deelprogramma 2.1, S: 2026 -172, 2027 -565, 2028 -858, 2029 -858 duizend euro) |
| ☐ | p_wegenfundering_warmtestad | Niet meer betalen voor wegfundering warmtenet | + 0,450 | I | https://groningen.begroting-2026.nl/p43769 (Intensiveringen begroting 2026, nr. 1 'Verwijderen wegenfundering Warmtestad', deelprogramma 1.1, I: 2026 -450, 2027 -450 duizend euro) |
| ☐ | p_energiebedrijf | Stoppen met het Energiebedrijf Groningen | + 0,201 | I | https://groningen.begroting-2026.nl/p43769 (Intensiveringen begroting 2026, nr. 7 'Organisatiekosten Energiebedrijf Groningen', deelprogramma 1.3, I: 2026 -201 / dekking organisatiekosten programma energie +201 duizend euro) |
| ☐ | p_prullenbakken | Meer prullenbakken op straat | − 0,500 | S | VVD-tegenbegroting 2026 'Het kan en moet anders', uitgave 'Prullenbakken openbare ruimte' 0,5 mln S (data/tegenbegroting-vvd-2026.json, game_koppeling null; docs/OPTIES-KOPPELING.md bij optie 143; data/dwarsverbanden.json nieuw:prullenbakken) |
| ☐ | p_gele_loper | Stoppen met de aanpak Gele Loper | + 1,205 | I | https://groningen.begroting-2026.nl/p43740 (2.2, tabel intensiveringen: '17. Implementatie en uitvoering Integrale Aanpak Gele Loper 1.055 I' en '19. Verplaatsingseffecten 150 I'); toelichting in https://groningen.begroting-2026.nl/p43769 (Intensiveringen, punt 17/18/19/23: 1,495 mln in 2026) |
| ☐ | p_veilig_uitgaan | Stoppen met actieprogramma Veilig Uitgaan | + 0,590 | I | https://groningen.begroting-2026.nl/p43740 (2.2, tabel intensiveringen: '21. Veilig uitgaan 590 I'); toelichting in https://groningen.begroting-2026.nl/p43769 (punt 21/22) |
| ☐ | p_woonoverlast | Geen woonoverlast-coördinator | + 0,100 | I | https://groningen.begroting-2026.nl/p43740 (2.2, tabel intensiveringen: '20. Woonoverlast coördinator 100 I'); toelichting in https://groningen.begroting-2026.nl/p43769 (punt 20) |
| ☐ | p_pandenbrigade | Stoppen met de pandenbrigade | + 0,692 | S | https://groningen.begroting-2026.nl/p43740 (2.2, regel 'Aanpak misstanden vastgoedsector 566: Inzet van de pandenbrigade' en tabel intensiveringen '11. Aanpak misstanden vastgoedsector (pandenbrigade) 126 S' en '12. Incidentele inzet vastgoedsector 602 I'); toelichting in https://groningen.begroting-2026.nl/p43769 (punt 11/12) |
| ☐ | p_niemeyer | Schrappen cultuurprogramma Niemeyer | + 0,250 | I | https://groningen.begroting-2026.nl/p43755 (3.5, tabel intensiveringen: '51. Cultuurprogramma Niemeyer 250 I'); toelichting in https://groningen.begroting-2026.nl/p43769 (punt 51: plankosten en businesscase voor het gemeentelijk deel van Niemeyer) |
| ☐ | p_plankosten_muziekcentrum | Pauze plannen nieuw muziekcentrum en Martiniplaza | + 1,000 | I | https://groningen.begroting-2026.nl/p43755 (3.5, regel 'Overig 2.000': 'Daarnaast geven we 1 miljoen euro uit aan plankosten voor de ontwikkeling van het nieuwe muziekcentrum en voor de nieuwbouw Martiniplaza') |
| ☐ | p_huur_sport | Sportclubs 10% meer huur laten betalen | + 0,430 | S | https://groningen.begroting-2026.nl/p43752 (3.4, regel Sportaccommodaties: baten 'voor de overige sportaccommodaties (5,4 miljoen euro)', 'met name huuropbrengsten, entree- en lesgelden en doorberekende kosten') |
| ☐ | p_positief_opgroeien | Stoppen met Positief Opgroeien (en School als Wijk) | + 1,700 | S | https://groningen.begroting-2026.nl/p43749 (deelprogramma 3.3, 'Waar gaat het geld voornamelijk naar toe', Positief opgroeien: lasten 2.800, baten 1.100; 'We hebben hiervoor (inclusief School als Wijk) 2,8 miljoen euro begroot. We ontvangen hiervoor diverse bijdragen, onder meer 0,7 miljoen euro uit de regio voor School als Wijk') |
| ☐ | p_preventie_scholen | Geen extra geld voor preventie op scholen | + 0,554 | I | https://groningen.begroting-2026.nl/p43769 (Intensiveringen, nr. 40 'Uitname DU Jeugd - Grote Stedenbeleid', 3.2, I, -554 in 2026, met toelichting 'We stellen in 2026 554 duizend euro incidenteel beschikbaar om de activiteiten te continueren') en https://groningen.begroting-2026.nl/p43746 (tabel intensiveringen 3.2) |

## 7. Aannames in de kettingeffecten

Parameters met status "aanname" of "te onderzoeken". Deze bedragen staan in de game met ⚠︎.

| Verband | Parameter | Waarde | Status | Toelichting |
| --- | --- | --- | --- | --- |
| kd_afval | aandeel_toegerekende_overhead | 0.1 | te onderzoeken | Deel van de overhead dat via de heffing wordt gedekt. Minder afvaldienst betekent minder overhead die de heffing draagt, wat de algemene middelen belast. Opvragen bij de gemeente. |
| kd_riool | factor_groen_riool | 0.1 | aanname | Zeer onzeker; alleen als verhalend effect tonen of na onderzoek met een getal. |
| kd_leges_omgeving | drempel_pct | 20 | aanname | Toegevoegd uit de formule (bij pct < -20): vanaf deze bezuiniging loopt de woningbouw vertraging op. |
| kd_bedrijfsafval | aandeel_vaste_kosten | 0.2 | te onderzoeken | Welk deel van de kosten doorloopt als de gemeente stopt. |
| kd_werkplaats | aandeel_overheadvrijval | 0.1 | te onderzoeken |  |
| kd_zwembad_tarief | elasticiteit | -0.4 | aanname | Literatuur over vrijetijdsvoorzieningen: -0,2 tot -0,6. |
| kd_schouwburg | factor_bezoekers | 0.05 | aanname | Aandeel hotelovernachtingen dat door cultuur wordt veroorzaakt. |
| rijk_buig | gem_uitkering | 0.0165 | te onderzoeken | Ca. 16.500 euro per huishouden: nagaan met het aantal bijstandshuishoudens uit de begroting. |
| rijk_buig | aantal_bijstand | null | te onderzoeken | Uit het beleidsindicatorenoverzicht van de begroting halen. |
| rijk_verdeelmodel | inwoners_per_woning | 1.93 | aanname | Gemiddelde in de gemeente: 244.427 inwoners (CBS StatLine 70072ned, 1 januari 2026) / 126.796 woningen (begroting 2026, kerngegevens). Of een nieuwe woning evenveel bewoners heeft, is een aanname. |
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
| wg_woningbouw | ozb_per_woning | null | te onderzoeken | Niet nodig zolang tarieven-JJJJ.json er is: de game rekent dan met het OZB-tarief voor woningen x de gemiddelde WOZ-waarde uit de kerngegevens x woz_factor_nieuwbouw (2026: 0,1473% x 340.000 x 1,32 = 661 euro), met de OZB-keuze van de speler. Eerder stond hier 0,0003 (300 euro) als aanname. |
| wg_woningbouw | extra_woningen_per_mln_fonds | 20 | aanname | Aanname: elk miljoen per jaar in het Sneller-bouwenfonds levert 20 extra woningen per jaar op, vanaf 2 jaar na de start. |
| wg_woningbouw | woz_factor_nieuwbouw | 1.32 | aanname | Afgeleid uit CBS Kerncijfers wijken en buurten 2025 (86165NED), 115 buurten van de gemeente Groningen: gemiddelde WOZ-waarde tegen het aandeel woningen met bouwjaar in de afgelopen tien jaar, gewogen naar het aantal woningen. Een buurt met alleen nieuwbouw komt uit op 412 duizend euro, tegen 313 duizend gemiddeld (factor 1,32). Buurten met minstens 50% nieuwbouw geven 407 duizend. Er is geen CBS-tabel met de WOZ-waarde naar bouwjaar; daarom een aanname. |
| wg_woningbouw | extra_woningen_per_mln_ro | null | te onderzoeken | Hoeveel extra woningen per jaar levert elk extra miljoen per jaar voor ambtenaren wonen (w4) of gebiedsontwikkeling (e10) op? Nog geen bron; tot dan rekent dit deel niet mee. |
| wg_verduurzaming | rendement | 0.08 | aanname |  |
| en_opwek | gemiste_opbrengst | null | te onderzoeken | Uit de businesscase halen. |
| org_frictie | verloop_pct | 0.05 | aanname | Natuurlijk verloop bij gemeenten: 4 tot 7%. |
| org_frictie | frictie_factor | 1 | aanname |  |
| org_capaciteit | factor_tempo | 0.5 | aanname | Toegevoegd uit de formule (tempo_projecten *= 1 + 0,5 * pct_apparaat/100), zodat de rekenmotor het getal uit de data leest. |
| org_ai | rendement | 0.5 | aanname |  |
| org_ai | ingroei | [0,0.3,0.7,1] | aanname |  |
| fin_kapitaallasten | levensduur_gebouw | 40 | aanname | Afschrijvingsbeleid gemeente nagaan. |
| fin_kapitaallasten | levensduur_brug | 50 | aanname |  |
| fin_kapitaallasten | rente | 0.025 | aanname | Omslagrente uit de begroting. |
| fin_reserves | ondergrens_ratio | 1 | aanname | Toegevoegd uit het mechanisme: een weerstandsvermogen onder 100% is een waarschuwingssignaal. Spelregel. |
| jur_subsidies | ingroei | [0.25,1] | aanname |  |

## 8. Tarieven (feit)

Bron: [Gemeente Groningen, raadsvoorstel Belastingtarieven 2027 (p. 1-3)](https://gemeenteraad.groningen.nl/Documenten/Belastingtarieven-2027.pdf).

| ✓ | Tarief | Bedrag |
| --- | --- | --- |
| ☐ | OZB woningen, eigenaar | 0,15% van de WOZ-waarde |
| ☐ | Afvalstoffenheffing, 1 persoon | € 310,8 |
| ☐ | Afvalstoffenheffing, 2 personen | € 363,72 |
| ☐ | Afvalstoffenheffing, 3 of meer | € 441,6 |
| ☐ | Rioolheffing, eigenaar | € 193,18 |

## 9. Parkeren per vergunning en zone

De schuif Parkeertarieven (36,299 mln) is verdeeld in posten. Samen: 36,299 mln. Vergunningen: aantal × tarief. Kortparkeren: de parkeerbelasting uit de kerngegevens min de vergunningen. Garages: de rest.

Bronnen: [Voortgang pakket parkeermaatregelen, technisch rapport (september 2025)](https://gemeenteraad.groningen.nl/Documenten/Bijlage-Voortgang-pakket-parkeermaatregelen-technisch-rapport.pdf) (2025-09, feit); [Gemeente Groningen, raadsvoorstel Belastingtarieven 2026 (via zoekresultaten, document zelf nog niet ingezien)](https://gemeenteraad.groningen.nl/Documenten/Belastingtarieven-2026.pdf) (2025-11, te controleren); [Ontwerpbegroting 2026 (kerngegevens en schuif t5)](https://gemeenteraad.groningen.nl/Documenten/Bijlage-2-Ontwerpbegroting-2026-boekwerk.pdf) (2025-09, feit); [Gemeente Groningen, raadsvoorstel Belastingtarieven 2027 (registratienummer 274695-2026), p. 6-7](https://gemeenteraad.groningen.nl/Documenten/Belastingtarieven-2027.pdf) (2026-09, feit); [Ontwerpbegroting 2027 (kerngegevens p. 5, lokale heffingen p. 275)](https://gemeenteraad.groningen.nl) (2026-09, feit).

| ✓ | Post | Tarief (bron, jaar) | Aantal (jaar) | Opbrengst (mln) | Status |
| --- | --- | --- | --- | --- | --- |
| ☐ | Bewonersvergunning (binnenstad) | € 394,20 (2026), geïndexeerd € 412,25 | 765 (2025) | 0,315 | ⚠︎ aanname |
| ☐ | Bewonersvergunning (tweede zone) | € 135,05 (2026), geïndexeerd € 141,24 | 9.275 (2025) | 1,310 | ⚠︎ aanname |
| ☐ | Bewonersvergunning (derde tot en met vijfde zone) | € 62,05 (2026), geïndexeerd € 64,89 | 17.710 (2025) | 1,149 | ⚠︎ aanname |
| ☐ | Tweede bewonersvergunning (tweede zone) | € 408,80 (2026), geïndexeerd € 427,52 | 336 (2025) | 0,144 | ⚠︎ aanname |
| ☐ | Bezoekersvergunning | € 25,00 (2026), geïndexeerd € 26,15 | 24.621 (2025) | 0,644 | ⚠︎ aanname |
| ☐ | Bedrijfsvergunning | € 135,05 (2026), geïndexeerd € 141,24 | 2.215 (2025) | 0,313 | ⚠︎ aanname |
| ☐ | Mantelzorgvergunning | € 26,02 (2026), geïndexeerd € 27,21 | 247 (2025) | 0,007 | ⚠︎ aanname |
| ☐ | Maatschappelijke parkeervergunning | € 65,70 (2026), geïndexeerd € 68,71 | 110 (2025) | 0,008 | feit |
| ☐ | Kortparkeren (uurtarief) en overige parkeerbelasting | afgeleid |  | 23,635 | ⚠︎ aanname |
| ☐ | Parkeergarages | afgeleid |  | 8,775 | ⚠︎ aanname |

Uurtarieven kortparkeren (alleen ter informatie; de game heeft één schuif voor kortparkeren):

| ✓ | Zone | Uurtarief (jaar) |
| --- | --- | --- |
| ☐ | Zone 1 (binnenstad) | € 5,00 (2026) |
| ☐ | Zone 2 (onder andere Oosterpoort, Schildersbuurt, Korrewegwijk, Haren Centrum) | € 4,50 (2026) |
| ☐ | Zone 3 (onder andere Paddepoel, Selwerd, Helpman, De Linie) | € 2,70 (2023) |
| ☐ | Zone 4 (Hoornse Meer, De Wijert-Zuid, Stadspark, Oosterhoogebrug) | € 2,70 (2023) |
| ☐ | Zone 5 (Haren Schil, alleen voor vergunninghouders) | onbekend |
