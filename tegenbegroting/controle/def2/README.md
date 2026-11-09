# Eindcontrole DEF_1 → DEF_2 (9 november 2026)

Scripts waarmee `20261111_Tegenbegroting_2027_VVD_Groningen_DEF_2.docx` uit DEF_1 is gebouwd.

- `keuzes_def1.ts` / `run_def1.ts`: de invoer van DEF_1 in het rekenmodel (`src/engine`), variant `regels` → `regels_regels.json`.
- `tabellen.py`: tabelregels per jaar uit de doorrekening (afgerond op 3 decimalen; totalen = som van afgeronde regels). Frictiekosten zijn op 2,5 gezet (fractiebesluit).
- `apply_fin.py`: financiële correcties in de drie tabellen en de lopende tekst.
- `zeker_eigen.json`, `zeker_agent.json`: alle tekstcorrecties (oud → nieuw, met reden).
- `gdoc.py`: veilig bewerken van de Google-Docs-export (tekst over runs en suggestieblokken heen, metadata verwijderen).
- `build.py <werkmap>`: bouwt het docx, rendert met LibreOffice en zet de paginanummers in de inhoudsopgave (twee passes).
- `verify.py <docx>`: onafhankelijke controle van alle tabellen.

De paden verwachten de indeling van de werkmap waarin is gebouwd (`src/` = uitgepakt DEF_1, `game/regels_regels.json`, `covers/`).
