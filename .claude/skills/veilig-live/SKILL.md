---
name: veilig-live
description: Keurt de code van je app voordat je hem live zet en legt in gewone taal uit wat er lek is, waarom dat je geld of een datalek kan kosten, en welk zinnetje je aan Claude geeft om het te repareren. Kijkt naar wachtwoorden en API-sleutels in de code, een ontbrekende limiet op inlogpogingen en publieke verzoeken, een zelfgebouwd inlogsysteem, tabellen zonder Row Level Security, persoonsgegevens op plekken waar ze niet horen (AVG), een ontbrekende maandlimiet bij je AI-aanbieder en verouderde pakketten. Verandert zelf niets aan je code. Gebruik bij check mijn app op lekken, is mijn app veilig, voor ik live ga, kan dit zo live, keur mijn app, veiligheidscheck, security check, zitten er lekken in mijn code, staan mijn sleutels goed, is mijn Supabase goed beveiligd, of wanneer iemand een met AI gebouwde app online wil zetten.
---

# Veilig live

Je keurt een app die iemand met AI heeft gebouwd en online wil zetten. Vaak is dat
iemand zonder programmeerachtergrond. Je zoekt in de code van de map waarin je nu
werkt naar zeven soorten lekken en je schrijft een rapport dat iemand zonder
technische kennis in een keer snapt.

## Spelregels

1. **Alleen kijken.** Je wijzigt, verplaatst of verwijdert geen enkel bestand, je
   installeert niets, je start de app niet en je gebruikt geen sleutels uit het
   project om ergens in te loggen. Repareren doe je pas als de gebruiker daar na het
   rapport zelf om vraagt (zie onderaan).
2. **Laat nooit een volledig geheim zien.** In je antwoord en in het rapport staat van
   een sleutel of wachtwoord hooguit het begin (vier tekens) plus `...`, met het
   bestand en het regelnummer.
3. **Geen vals alarm.** Meld alleen wat je in deze code echt ziet. Twijfel je, zet het
   dan onder "Niet zeker" met de reden. Wat je vanuit de code niet kunt zien (zoals
   een maandlimiet in een dashboard) komt onder "Check zelf even", nooit als fout.
4. **Gewone taal.** Elk vakwoord leg je de eerste keer uit in een bijzin. Bijvoorbeeld:
   een API-sleutel, het wachtwoord waarmee je app bij een dienst als OpenAI inlogt en
   waar de rekening op binnenkomt.
5. **Claude Code en Cowork.** Kun je commando's draaien, gebruik ze dan (alleen
   lezende commando's). Kun je dat niet, lees en doorzoek de bestanden dan met je
   eigen lees- en zoekfuncties. Het rapport is in beide gevallen hetzelfde.

## Stap 1: wat voor app is dit?

Zoek dit kort uit. Het hoort niet als lap tekst in het rapport, wel als een zin
bovenaan.

- **Welke bestanden er zijn:** `package.json`, `requirements.txt`, `pyproject.toml`,
  een map `supabase/`, `firebase.json`, `.env`-bestanden, `next.config`, `vite.config`
  en dergelijke.
- **Wat in de browser draait** (alles wat een bezoeker kan inzien): mappen als `src/`,
  `app/`, `pages/`, `components/`, `public/`, bestanden met `"use client"`, Vite-,
  React-, Vue- of Svelte-code. **Wat op de server draait:** `api/`, `server/`,
  `route.ts`, server actions, `supabase/functions/`, een Python- of Node-backend.
- **Welke diensten:** database (Supabase, Firebase, een eigen database), inloggen
  (Supabase Auth, Clerk, Firebase Auth, Auth0, Auth.js, of iets zelfgebouwds) en
  AI-aanbieders (Anthropic, OpenAI, Google Gemini, OpenRouter, Mistral en andere).
- **Is het een git-project** (staat er een map `.git`)?

Sla bij al het zoekwerk deze mappen over: `node_modules`, `.git`, `.next`, `dist`,
`build`, `out`, `.venv`, `venv`, `__pycache__`, `.vercel`, `coverage`, en `.claude`
(daar staan skills en instellingen, geen app-code; ook deze skill zelf). Is `dist` of
`build` de enige plek waar de browsercode staat, doorzoek die dan wel.

Staat er geen code in de map, of alleen documenten? Zeg dat in een zin en stop.

## Stap 2: de zeven controles

### 1. Geheimen in de code

**Wat telt als geheim:** sleutels van AI-diensten (beginnen vaak met `sk-ant-`,
`sk-proj-`, `sk-or-`, `sk-` of `AIza`), een Supabase secret key (`sb_secret_...`) of de
oude `service_role`-sleutel, Stripe-sleutels (`sk_live_`, `rk_live_`, `whsec_`),
GitHub-tokens (`ghp_`, `github_pat_`), Slack-tokens (`xox`), AWS-sleutels (`AKIA`),
databaselinks met een wachtwoord erin (`postgres://naam:wachtwoord@...`), private keys
(`-----BEGIN ... PRIVATE KEY-----`) en regels als `password = "..."` of
`API_KEY = "..."` met een echte waarde.

**Waar je zoekt, van ernstig naar minder ernstig:**

a. **In code die in de browser draait.** Drie vormen:
   - de sleutel staat letterlijk in een frontendbestand;
   - de sleutel zit in een omgevingsvariabele met een publiek voorvoegsel:
     `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`, `PUBLIC_`, `NUXT_PUBLIC_`,
     `GATSBY_`. Alles met zo'n voorvoegsel wordt ingebakken in de app die bezoekers
     downloaden. Bevat de naam KEY, SECRET, TOKEN, PASSWORD of SERVICE_ROLE en is het
     geen publiek bedoelde sleutel (lijst hieronder), dan is hij openbaar;
   - een AI-pakket dat in de browser praat: `dangerouslyAllowBrowser: true`, of een
     rechtstreekse aanroep van `api.openai.com`, `api.anthropic.com`,
     `generativelanguage.googleapis.com` of `openrouter.ai` vanuit frontendcode.

b. **Letterlijk in servercode of in een configuratiebestand.**

c. **Een `.env`-bestand met echte waarden dat in git zit.** Controleer met
   `git ls-files` of er een `.env` (of `.env.local`, `.env.production`) wordt
   bijgehouden, en of `.gitignore` die bestanden uitsluit. Een `.env` die bestaat maar
   door `.gitignore` wordt uitgesloten is goed. Een `.env.example` met nepwaarden ook.

d. **In de git-geschiedenis.** Een sleutel die is weggehaald staat nog in elke oude
   versie. Zoek zonder de waarde te tonen, bijvoorbeeld:
   `git log --all --oneline -G 'sk-ant-|sk-proj-|sk_live_|sb_secret_|AIza|ghp_|BEGIN .*PRIVATE KEY'`.
   Een treffer in de geschiedenis is rood als de code ooit openbaar of gedeeld is
   geweest, anders oranje. Je weet dat meestal niet, dus zeg het erbij. Noem welke
   soort sleutel het is en in welke versie hij erin kwam, ook als hij later is
   weggehaald: zo'n sleutel moet nog steeds worden ingetrokken.

**Niet melden, want publiek bedoeld:** de Supabase publishable key
(`sb_publishable_...`), de Supabase anon-sleutel, de Firebase-webconfiguratie (een
`apiKey` die met `AIza` begint en naast `authDomain` en `projectId` in een
`firebaseConfig` staat), Stripe publishable keys (`pk_live_`, `pk_test_`), Clerk
publishable keys, een Sentry DSN, sleutels van PostHog of Plausible, en duidelijke
nepwaarden (`your-key-here`, `xxx`, `changeme`).

**Twijfel tussen anon en service_role?** Beide oude Supabase-sleutels beginnen met
`eyJ`. Decodeer alleen het middelste stuk (tussen de twee punten, base64) en kijk naar
`"role"`: `anon` is publiek, `service_role` is de hoofdsleutel. Een `AIza`-sleutel die
met Gemini of `GoogleGenerativeAI` wordt gebruikt is wel geheim.

**Waarom dat erg is:** programmaatjes zoeken de hele dag websites en GitHub af naar
sleutels. Vinden ze er een, dan draait iemand anders op jouw rekening. Met de
Supabase-hoofdsleutel kan iemand je hele database lezen, aanpassen en wissen; de
afscherming per gebruiker (Row Level Security) geldt dan niet.

**Zinnetje voor de gebruiker:**
> Haal de [naam]-sleutel uit [bestand] en uit alle code die in de browser draait. Zet hem in een .env-bestand dat niet in git komt en laat alleen de server ermee praten. Leg me daarna stap voor stap uit hoe ik de oude sleutel intrek en een nieuwe maak.

Zeg er altijd bij: alleen verplaatsen is niet genoeg. Een sleutel die openbaar is
geweest moet je intrekken en vervangen.

### 2. Geen limiet op inloggen en andere publieke verzoeken

Een limiet (rate limit) bepaalt hoe vaak iemand per minuut iets mag proberen.

- **Inloggen via Supabase Auth, Clerk, Firebase Auth of Auth0:** daar zit standaard al
  een limiet op inlogpogingen in. Niet melden; wel een regel onder "Wat al goed staat".
- **Eigen routes die publiek zijn:** een eigen inlogroute, wachtwoord vergeten,
  registreren, een contactformulier, een nieuwsbriefformulier, en vooral routes die
  een AI-model aanroepen, mail of sms versturen of iets met betalen doen. Zoek of daar
  een limiet op zit: pakketten als `express-rate-limit`, `@upstash/ratelimit`,
  `rate-limiter-flexible`, `@nestjs/throttler`, `slowapi`, `flask-limiter`,
  `django-ratelimit`, een eigen teller per IP-adres of per gebruiker, of
  firewallregels in de configuratie. Een captcha telt als halve oplossing.
- **Een AI-route die zonder inloggen bereikbaar is en geen limiet heeft** is rood:
  iedereen kan jouw AI dan de hele nacht laten draaien.
- Alleen een statische website zonder eigen server? Dan is deze controle niet van
  toepassing.

**Waarom dat erg is:** een botje probeert zonder limiet duizenden wachtwoorden per
minuut tot er een klopt, of bestookt je AI-route en jij krijgt de rekening.

**Zinnetje:**
> Zet een limiet op [route]: maximaal [bijvoorbeeld 5] pogingen per minuut per IP-adres en per account, met een nette foutmelding daarna. Gebruik een bekende, bestaande bibliotheek en leg uit wat je hebt gedaan.

### 3. Een zelfgebouwd inlogsysteem

**Signalen:** wachtwoorden zelf versleutelen (`bcrypt`, `argon2`, `scrypt`, `pbkdf2`,
of erger: `md5` of `sha256` op een wachtwoord), een eigen gebruikerstabel met een
wachtwoordkolom, zelf `jwt.sign` en `jwt.verify` met een eigen geheim, zelf tokens of
sessies in `localStorage` zetten, een zelfgemaakte wachtwoord-reset, of een
"inlog" die alleen in de browser een wachtwoord vergelijkt.

**Niet melden:** inloggen via Supabase Auth, Clerk, Firebase Auth, Auth0, Kinde,
WorkOS, Better Auth, of Auth.js met inloggen via Google, Microsoft en dergelijke.
Auth.js met een eigen "credentials"-inlog (je controleert de wachtwoorden zelf) is
half zelfgebouwd: oranje.

**Waarom dat erg is:** inloggen heeft tientallen valkuilen, van wachtwoorden veilig
opslaan tot reset-links en sessies die verlopen. Een gespecialiseerde dienst heeft
die allemaal al opgelost en getest. Een eigen versie mist er bijna altijd een paar.

**Zinnetje:**
> Vervang mijn zelfgebouwde inlogsysteem door [Supabase Auth, Clerk of een andere bekende dienst]. Maak eerst een plan met welke bestanden veranderen en hoe bestaande gebruikers overgaan, en wacht op mijn akkoord voor je begint.

### 4. Tabellen zonder afscherming per gebruiker (Row Level Security)

Row Level Security, kortweg RLS, is de regel in je database die zegt: iedereen ziet
alleen zijn eigen rijen. Zonder RLS kan iedereen die de publieke sleutel uit je
website haalt alle rijen van alle klanten lezen, en vaak ook aanpassen of wissen.

**Supabase:**
- Loop alle SQL langs (`supabase/migrations/*.sql`, `schema.sql`, SQL in de code).
  Heeft elke tabel in het `public`-schema `enable row level security`? En zijn er
  policies (de regels zelf)?
- Een policy met `using (true)` of `with check (true)` op een tabel met
  gebruikersgegevens zet die tabel voor iedereen open. Hetzelfde geldt voor een
  leesregel voor `anon` (niet-ingelogde bezoekers) op persoonlijke gegevens.
- Views negeren RLS, tenzij ze gemaakt zijn met `with (security_invoker = true)`.
- Opslag (storage buckets) met `public: true` voor bestanden van gebruikers, zoals
  facturen of identiteitsbewijzen, staat voor iedereen open.
- Staan de tabellen niet in de code (gemaakt via het dashboard), dan kun je dit niet
  zien. Zet het onder "Check zelf even": in Supabase de Security Advisor openen (in
  het menu onder Advisors) en kijken of er een melding staat dat een tabel publiek
  toegankelijk is of dat RLS uit staat.

**Firebase:** kijk in `firestore.rules`, `storage.rules` en `database.rules.json`.
`allow read, write: if true;`, `".read": true`, of de testregel met een datum
(`request.time < timestamp.date(...)`) betekent: open voor iedereen. Geen
regelbestand in de map? Dan onder "Check zelf even" in de Firebase-console.

**Eigen database en eigen server:** zoek routes die een record ophalen met een nummer
uit de adresbalk (bijvoorbeeld `/api/orders/123`) zonder te controleren of dat
record van de ingelogde gebruiker is. Zelfde voor beheerpagina's zonder controle of
iemand beheerder is.

**Waarom dat erg is:** klant A ziet de gegevens van klant B. Gaat het om
persoonsgegevens, dan is dat een datalek dat je binnen 72 uur moet melden bij de
privacytoezichthouder (in Nederland de Autoriteit Persoonsgegevens, in België de
Gegevensbeschermingsautoriteit). Zo staat het in artikel 33 van de AVG.

**Zinnetje:**
> Zet Row Level Security aan op de tabel [naam] en maak regels zodat iedere gebruiker alleen zijn eigen rijen kan lezen en aanpassen. Laat me daarna met twee testaccounts zien dat account A de gegevens van account B niet kan zien.

### 5. Persoonsgegevens op plekken waar ze niet horen (AVG)

Persoonsgegevens zijn namen, mailadressen, telefoonnummers, adressen, geboortedatums,
BSN of rijksregisternummer, IBAN, IP-adressen, gezondheidsinformatie en natuurlijk
wachtwoorden.

**Zoek naar:**
- logregels (`console.log`, `print`, `logger.info`, extra's voor Sentry) die een hele
  gebruiker, een heel formulier, een verzoek met wachtwoord, of tokens wegschrijven;
- persoonsgegevens in een webadres (`?email=...`), of zonder reden in
  `localStorage`, `sessionStorage` of cookies;
- echte klantgegevens in de map zelf: exports (`.csv`, `.xlsx`, `.json`),
  databasedumps (`.sql`, `.dump`, `.backup`) of testdata met echte mailadressen;
- foutmeldingen die het hele record of de technische foutdetails aan de bezoeker
  laten zien;
- persoonsgegevens die zonder noodzaak naar een AI-dienst of een
  bezoekersstatistiek gaan (een heel klantdossier in een prompt, een mailadres in
  een analytics-event);
- uploads van gebruikers in een publieke map.

**Niet melden:** duidelijke nepdata (`@example.com`, `test@test.nl`, Jan Jansen in een
testbestand) en logregels met alleen een gebruikersnummer.

**Waarom dat erg is:** logs worden vaak maanden bewaard en door meer mensen en
diensten gelezen dan je denkt. De AVG zegt dat je alleen bewaart wat nodig is, en wat
via een log of een vergeten export uitlekt is net zo goed een datalek.

**Zinnetje:**
> Haal de persoonsgegevens uit [bestand, regel]: log alleen het gebruikersnummer in plaats van [het hele object, het mailadres]. Zoek daarna in het hele project naar vergelijkbare plekken en laat me de lijst zien voor je iets aanpast.

### 6. Geen maandlimiet bij je AI-aanbieder

Dit zie je niet in de code, het is een instelling bij de aanbieder. Wat je wel ziet is
welke aanbieders de app gebruikt (pakketten en namen van sleutels). Zet per gevonden
aanbieder een regel onder "Check zelf even":

- **Anthropic (Claude):** in de Claude Console onder Settings, Billing, bij Spend
  limits op Set limit of Adjust limit (platform.claude.com/settings/billing). Bereik
  je die limiet, dan stopt de API tot de volgende maand of tot je hem verhoogt.
- **Andere aanbieders** (OpenAI, Google Gemini, OpenRouter en andere): menu's
  veranderen vaak. Kun je op internet zoeken, zoek dan de actuele helppagina van die
  aanbieder op en noem de plek. Kun je dat niet, zeg dan dat de gebruiker in de
  instellingen bij Billing of Limits moet kijken. Zeg er in beide gevallen bij dat
  sommige limieten alleen een waarschuwingsmail sturen en de app niet stoppen. Dan is
  werken met vooraf gekocht tegoed, met automatisch bijladen uit, de zekerste stop.

Heeft de app een publieke AI-functie zonder grens per gebruiker (bijvoorbeeld
maximaal twintig vragen per dag), noem dat dan bij controle 2.

Geen AI-aanbieder gevonden? Dan is deze controle niet van toepassing.

**Waarom dat erg is:** lekt een sleutel uit of misbruikt iemand je app, dan is de
maandlimiet het verschil tussen een rekening van honderd euro en een van duizenden.

**Zinnetje:**
> Help me stap voor stap een maandlimiet van [bedrag] euro in te stellen bij [aanbieder]. Zoek eerst op de actuele helppagina op waar die instelling zit.

### 7. Verouderde of kwetsbare pakketten

Pakketten zijn de stukjes code van anderen waar je app op leunt. Van oude versies zijn
de lekken vaak openbaar bekend.

- **JavaScript:** staat er een `package-lock.json`, draai dan `npm audit --omit=dev`.
  Bij `pnpm-lock.yaml`: `pnpm audit --prod`. Bij `yarn.lock`: `yarn npm audit` (Yarn 2
  en hoger) of `yarn audit` (Yarn 1). Deze commando's lezen alleen, ze installeren
  niets.
- **Python:** draai `pip-audit` alleen als het al geïnstalleerd is. Installeer het niet
  zelf zonder te vragen.
- Werkt het niet (geen internet, geen lockbestand, commando ontbreekt)? Zet het onder
  "Niet kunnen controleren" met het zinnetje.
- Meld alleen lekken met de ernst hoog of kritiek in pakketten die in de live app
  zitten, niet in hulpmiddelen voor ontwikkelaars. Een regel per pakket, ook als het
  meerdere lekken heeft.

**Waarom dat erg is:** voor bekende lekken bestaan kant-en-klare aanvallen. Wie een
oude versie draait, laat de deur open waar iedereen het adres van heeft.

**Zinnetje:**
> Werk [pakket] bij naar een veilige versie (minimaal [versie]). Draai daarna de app en de tests om te zien of alles nog werkt, en vertel me wat er veranderd is.

## Stap 3: het rapport

**Rood** is alles wat direct geld of een datalek kan kosten: een geheime sleutel in
browsercode of in git, de Supabase-hoofdsleutel in de frontend, een tabel met
persoonsgegevens zonder RLS of met een open regel, open Firebase-regels, een publieke
AI-route zonder inloggen en zonder limiet, echte klantgegevens in de map, en
wachtwoorden die in logs komen of zonder goede versleuteling worden opgeslagen.

**Oranje** is wat je voor de livegang wilt regelen: een zelfgebouwd inlogsysteem, geen
limiet op eigen inlog- of formulierroutes, persoonsgegevens in logs, kwetsbare
pakketten met ernst hoog of kritiek, een `.env` die niet in `.gitignore` staat, en een
sleutel in de git-geschiedenis (rood als de code openbaar is geweest).

Schrijf het rapport in de taal van de gebruiker, in dit format:

```
# Veiligheidscheck: [naam van de map]

[datum] · [wat voor app, in een zin, bijvoorbeeld: een website met een
Supabase-database en een chatfunctie met Claude]

**Oordeel:** [een van deze drie]
- Groen: klaar om live te gaan. Loop nog wel even de punten onder "Check zelf even" na.
- Oranje: bijna. Repareer eerst [aantal] punt(en).
- Rood: nog niet live zetten. [aantal] punt(en) kunnen je direct geld of een datalek kosten.

## Eerst repareren (rood)

### 1. [Titel in gewone taal, bijvoorbeeld: Je OpenAI-sleutel staat in je website]
**Waar:** `src/lib/ai.ts`, regel 4
**Wat is er mis:** [een of twee zinnen]
**Waarom is dat erg:** [de gevolgen: een rekening, een datalek, een overgenomen account]
**Repareren:** geef Claude dit zinnetje:
> [kant-en-klaar zinnetje, ingevuld met de echte namen, bestanden en routes]

## Ook doen voor je live gaat (oranje)

[zelfde opbouw, doorgenummerd]

## Check zelf even (dit zie ik niet in de code)

- [wat, waar je het vindt, waarom in een halve zin]

## Wat al goed staat

- [hooguit vijf korte regels, alleen wat je echt hebt gecontroleerd]

## Niet zeker of niet kunnen controleren

- [wat, en waarom niet]

Wil je dat ik iets repareer? Noem het nummer of plak het zinnetje. Ik pas niets aan
tot jij dat zegt.
```

Regels voor het rapport:
- Laat lege kopjes weg. Is er niets rood, dan staat dat kopje er niet.
- Komt hetzelfde probleem op meerdere plekken voor, noem het een keer met alle
  plekken erbij.
- Vul het zinnetje helemaal in met de echte namen, bestanden en routes uit deze
  code. Geen invulhaken laten staan.
- Houd het kort. Iemand moet het rapport in twee minuten kunnen lezen. "Check zelf
  even" en "Wat al goed staat" hebben elk hooguit vijf regels.
- Schrijf een reeks regels als "regel 4 tot 6", met woorden.
- Zet het rapport in de chat. Sla het alleen als bestand op (bijvoorbeeld
  `VEILIGHEIDSCHECK.md` in de projectmap) als de gebruiker daarom vraagt.

## Als de gebruiker daarna wil repareren

- Een punt tegelijk. Zeg eerst wat je gaat veranderen, doe het, en laat zien wat er
  veranderd is.
- Bij een gelekte sleutel: na het verplaatsen altijd uitleggen hoe je de oude
  sleutel intrekt en een nieuwe maakt. Een sleutel uit de git-geschiedenis halen is
  een aparte, ingrijpende stap; doe die alleen als de gebruiker daar na uitleg om
  vraagt.
- Nooit zelf iets uitrollen, pushen of live zetten. Dat doet de gebruiker.
- Draai na het repareren de betreffende controle opnieuw en zeg of het punt nu groen is.
