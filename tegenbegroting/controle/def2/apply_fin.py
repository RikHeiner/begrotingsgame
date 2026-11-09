# -*- coding: utf-8 -*-
"""Financiële correcties 'volgens de regels' + onderhoud 10%. Werkt op een GDoc-object."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tabellen import RO, RU, oS, oI, uS, uI, oI_tab, uI_tab, WS, sal, salS, salI, ket, cum, ONTTREKKING, fmt, q

def apply_fin(d):
    val = {r['label']: r for r in RO + RU}
    f0 = lambda lab: fmt(val[lab]['vals'][0])

    # --- tabel 0: ombuigingen en opbrengsten ---
    # WarmteStad-verkoop blijft staan (37,975 I); de aflossing staat in tabel 1
    d.set_row(0, 'Verkoop 49% van WarmteStad (eenmalig, tegen boekwaarde)', [None, fmt(WS), 'I'])
    nieuw_o = ['Kettingeffect: lager parkeertarief trekt meer bezoekers',
               'Verplichte tegenprestatie in de bijstand (vanaf 2028)',
               'Verkoop 49% van WarmteStad: lagere rentelasten (vanaf 2028)',
               'Kettingeffect: overhead werkplaats valt vrij (vanaf 2028)',
               'Kettingeffect: meer jeugdpreventie, minder jeugdzorg (vanaf 2028)']
    na = 'Geen geld voor Campus Camera'
    for lab in nieuw_o:
        d.insert_row_after(0, na, 'Geen geld voor Campus Camera', [lab, f0(lab), 'S'])
        na = lab
    if ONTTREKKING > 0:
        d.insert_row_after(0, 'Verkoop Glaudé- en Vapianopanden (eenmalig)', 'Geen gemeentegeld voor dierenartskosten',
                           ['Onttrekking algemene reserve (eenmalig, dekking frictiekosten)', fmt(ONTTREKKING), 'I'])
    # Energiebedrijf: incidentele post uit de begroting 2026 (budgetneutraal), niet in de begroting 2027
    d.delete_row(0, 'Stoppen met het Energiebedrijf Groningen (eenmalig)')
    totaal = oS[0] + oI_tab[0] + ONTTREKKING
    d.set_row(0, 'Totaal', [None, fmt(totaal), None])
    # controle: bestaande regels moeten gelijk zijn aan de doorrekening
    for r in RO:
        tr = d.find_row(0, r['label'])

    # --- tabel 1: uitgaven ---
    d.set_row(1, 'Extra investeren in beheer en onderhoud openbare ruimte 12,5%',
              ['Extra investeren in beheer en onderhoud openbare ruimte 10%', f0('Extra investeren in beheer en onderhoud openbare ruimte 10%'), None])
    d.set_row(1, 'Frictiekosten: vrijwillige vertrekregeling ambtenaren (eenmalig)',
              ['Frictiekosten minder ambtenaren (eenmalig, globale schatting)', f0('Frictiekosten minder ambtenaren (eenmalig, globale schatting)'), None])
    nieuw_u = ['Kettingeffect: restkosten na stoppen opvang ongedocumenteerden',
               'Kettingeffect: minder gemeentefonds door minder bijstand (vanaf 2028)',
               'Kettingeffect: cultuur en toeristenbelasting (vanaf 2028)']
    na = 'Afvalstoffen- en rioolheffing: geen extra doorberekening veegkosten'
    for lab in nieuw_u:
        d.insert_row_after(1, na, 'Ondermijning 10%', [lab, f0(lab), 'S'])
        na = lab
    d.set_row(1, 'Verbeteren financiële positie van de gemeente',
              ['Verbeteren financiële positie: aflossing lening met opbrengst WarmteStad (eenmalig)', fmt(WS), 'I'])
    STORT = sal[0] if sal[0] > 0 else 0
    if STORT:
        d.insert_row_after(1, 'Verbeteren financiële positie: aflossing lening met opbrengst WarmteStad (eenmalig)',
                           'Trainingscomplex FC Groningen (eenmalig)',
                           ['Verbeteren financiële positie: storting in de algemene reserve', fmt(STORT), 'I'])
    d.set_row(1, 'Totaal', [None, fmt(uS[0] + uI_tab[0] + STORT), None])
    for r in RU:
        d.find_row(1, r['label'])
    assert q(totaal) == q(uS[0] + uI_tab[0] + STORT), (totaal, uS[0] + uI_tab[0] + STORT)

    # --- alle bedragen in tabel 0 en 1 in één notatie uit de doorrekening, daarna controle ---
    from gdoc import para_text, W
    for ti, rows in ((0, RO), (1, RU)):
        for r in rows:
            tr = d.find_row(ti, r['label'])
            tcs = tr.findall(W + 'tc')
            oud = para_text(tcs[1]).strip()
            nieuw = fmt(r['vals'][0])
            if oud != nieuw:
                d.set_row(ti, r['label'], [None, nieuw, None])
    for ti, rows in ((0, RO), (1, RU)):
        for r in rows:
            tr = d.find_row(ti, r['label'])
            tcs = tr.findall(W + 'tc')
            shown = para_text(tcs[1]).strip(); si = para_text(tcs[2]).strip()
            assert shown == fmt(r['vals'][0]), (r['label'], shown, fmt(r['vals'][0]))
            assert si == r['s'], (r['label'], si, r['s'])

    # --- tabel 2: meerjarenbegroting ---
    L = lambda a: [fmt(x) for x in a]
    J = range(4)
    d.set_row(2, 'Ombuigingen en opbrengsten, structureel', [None] + L(oS))
    d.set_row(2, 'Ombuigingen en opbrengsten, incidenteel', [None] + L(oI_tab))
    d.set_row(2, 'Totaal ombuigingen en opbrengsten', [None] + L([oS[j] + oI_tab[j] for j in J]))
    d.set_row(2, 'Uitgaven, structureel', [None] + L(uS))
    d.set_row(2, 'Uitgaven, incidenteel (excl. storting reserves)', [None] + L(uI_tab))
    d.set_row(2, 'Totaal uitgaven', [None] + L([uS[j] + uI_tab[j] for j in J]))
    d.set_row(2, 'Saldo', [None] + L(sal))
    d.set_row(2, 'waarvan structureel', [None] + L(salS))
    d.set_row(2, 'waarvan incidenteel', [None] + L(salI))
    d.set_row(2, 'waarvan kettingeffecten en frictiekosten', [None] + L(ket))
    d.set_row(2, 'Cumulatief saldo', [None] + L(cum))
    # opmaak gelijktrekken: enkele cellen hadden in DEF_1 een afwijkend lettertype (Arial Unicode MS, andere grootte)
    import copy
    from gdoc import W as _W
    tbl2 = list(d.root.iter(_W + 'tbl'))[2]
    for tr in tbl2.findall(_W + 'tr'):
        tcs = tr.findall(_W + 'tc')
        if len(tcs) < 5:
            continue
        ref_run = tcs[3].find('.//' + _W + 'r')
        ref = ref_run.find(_W + 'rPr') if ref_run is not None else None
        if ref is None or ref.find(_W + 'rFonts') is not None:
            continue
        for tc in tcs[1:5]:
            for r in tc.iter(_W + 'r'):
                rp = r.find(_W + 'rPr')
                if rp is not None and rp.find(_W + 'rFonts') is not None or (rp is not None and rp.find(_W + 'sz') is None):
                    r.remove(rp)
                    r.insert(0, copy.deepcopy(ref))
                    d.log.append(('opmaak meerjarentabel gelijkgetrokken', ''.join(t.text or '' for t in r.iter(_W + 't')), 1))

    # --- lopende tekst ---
    R = d.replace
    from decimal import Decimal as _D, ROUND_HALF_UP as _H
    e = lambda x: str(_D(str(x)).quantize(_D('0.1'), rounding=_H)).replace('.', ',')
    R('Ook stopt de gemeente met de subsidie voor dierenartskosten (0,05 miljoen euro in 2027) en met het Energiebedrijf Groningen: de organisatiekosten van 0,2 miljoen euro in 2027 vervallen.',
      'Ook stopt de gemeente met de subsidie voor dierenartskosten (0,05 miljoen euro in 2027).')
    R('Verkoop tegen de boekwaarde (77,5 miljoen euro, ontwerpbegroting 2027 p. 247) levert eenmalig ongeveer 38 miljoen euro op. Dat geld storten we in de reserves.',
      'Verkoop tegen de boekwaarde (77,5 miljoen euro, ontwerpbegroting 2027 p. 247) levert eenmalig ongeveer 38 miljoen euro op. '
      'Daarmee lossen we leningen af. Omdat de verkoop tegen de boekwaarde gebeurt, is het geen winst, maar het verbetert wel de '
      'financiële positie: de schuld daalt en dat scheelt vanaf 2028 bijna 1 miljoen euro rente per jaar.')
    R('dienstverlening aan het loket, worden wel vervangen.',
      'dienstverlening aan het loket, worden wel vervangen. Omdat de besparing op de overhead al in 2027 wordt gehaald, sneller '
      'dan via natuurlijk verloop kan, houden we in 2027 rekening met eenmalige frictiekosten; als globale schatting 2,5 '
      'miljoen euro.')
    R('Dat scheelt in 2027 5,6 miljoen euro en in 2028 nog eens 5,0 miljoen euro.',
      'Dat scheelt in 2027 5,6 miljoen euro. Een deel van de mensen blijft in de stad en doet een beroep op nachtopvang en '
      'noodhulp; daarvoor houden we 1,1 miljoen euro per jaar aan.')
    R('dat maakt de stap naar een baan kleiner. Daarnaast investeren we fors in de begeleiding naar werk.',
      'dat maakt de stap naar een baan kleiner. Daarnaast investeren we fors in de begeleiding naar werk. Omdat '
      'minder mensen een uitkering nodig hebben, levert de tegenprestatie in 2028 0,8 miljoen euro op en vanaf 2029 1,6 miljoen '
      'euro per jaar.')
    R('Een lager tarief trekt meer bezoekers met de auto en dat is goed voor winkels en horeca in het centrum.',
      'Een lager tarief trekt meer bezoekers met de auto en dat is goed voor winkels en horeca in het centrum. Daardoor komt '
      'naar verwachting 1,8 miljoen euro van de gemiste parkeeropbrengst terug.')
    R('Extra investeren in beheer en onderhoud openbare ruimte 12,5%.', 'Extra investeren in beheer en onderhoud openbare ruimte 10%.')
    R('De VVD stelt voor om 12,5% extra budget beschikbaar te stellen', 'De VVD stelt voor om 10% extra budget (7,0 miljoen euro per jaar) beschikbaar te stellen')
    R('Het saldo dat na alle keuzes in 2027 overblijft, 39,1 miljoen euro inclusief de eenmalige opbrengst van de verkoop van WarmteStad, storten we hiervoor. Ook in de jaren daarna storten we het overschot in de reserves; dat is 42,1 miljoen euro in 2030. Over 2027–2030 groeien de reserves zo met 140,8 miljoen euro.',
      'Met de opbrengst van de verkoop van 49% van WarmteStad, ongeveer 38 miljoen euro, lossen we in 2027 leningen af. '
      f'Daarnaast storten we het overschot dat na alle keuzes overblijft in de reserves: {e(sal[0])} miljoen euro in 2027, oplopend tot '
      f'{e(sal[3])} miljoen euro in 2030. Over 2027–2030 groeien de reserves zo met {e(cum[3])} miljoen euro.')
    R('In 2027 is het overschot 39,1 miljoen euro, inclusief de eenmalige opbrengst van de verkoop van WarmteStad. Ook structureel houden we elk jaar geld over: 1,4 miljoen euro in 2027, oplopend tot 42,1 miljoen euro in 2030. Over 2027–2030 samen groeien de reserves zo met 140,8 miljoen euro.',
      'In 2027 lossen we met de opbrengst van de verkoop van WarmteStad ongeveer 38 miljoen euro aan leningen af. Ook houden we '
      f'dat jaar {e(sal[0])} miljoen euro over, waarvan {e(salS[0])} miljoen euro structureel. Daarna loopt het overschot op tot {e(sal[3])} miljoen euro '
      f'in 2030. Over 2027–2030 samen groeien de reserves zo met {e(cum[3])} miljoen euro.')
    R('Bron: Ontwerpbegroting 2027 gemeente Groningen; berekeningen VVD Groningen, inclusief kettingeffecten. S = structureel, I = incidenteel (eenmalig). Bedragen x 1 miljoen euro.',
      'Bron: Ontwerpbegroting 2027 gemeente Groningen; berekeningen VVD Groningen, inclusief kettingeffecten. S = structureel, '
      'I = incidenteel (eenmalig). Bedragen x 1 miljoen euro. Het saldo in de meerjarenbegroting is vóór storting in of '
      'onttrekking aan de reserve. Door afronding kan de som van de regels in de laatste decimaal afwijken.')
    return dict(omb2027=oS[0] + oI_tab[0], cum2030=cum[-1], saldo=sal, onttrekking=ONTTREKKING)
