"""Tabelwaarden voor de 'regels'-variant uit de doorrekening (regels_regels.json)."""
import json, os
from decimal import Decimal as D, ROUND_HALF_UP
HERE = os.path.dirname(os.path.abspath(__file__))
G = {r['id']: r for r in json.load(open(os.path.join(HERE, '..', 'game', 'regels_regels.json')))}
# Keuze fractie: frictiekosten 2,5 mln in totaal (globale schatting) in plaats van 8,4 mln uit het model
FRICTIE_MODEL = G['org_frictie']['perJaar'][0]
G['org_frictie']['perJaar'] = [-2.5, 0, 0, 0]
q = lambda x: D(x).quantize(D('0.001'), rounding=ROUND_HALF_UP)
def fmt(x):
    s = f'{q(x):.3f}'.rstrip('0')
    if s.endswith('.'): s += '0'
    if s == '-0.0': s = '0.0'
    return s.replace('.', ',').replace('-', '−')
def v(ids, j):
    ids = [ids] if isinstance(ids, str) else ids
    return sum(D(str(G[i]['perJaar'][j])) for i in ids)
VERG = [k for k in G if k.startswith('t5:') and k not in ('t5:kortparkeren', 't5:garages')]
# (label in het document, game-id(s), S/I, tabel O/U)
O = [
 ('Besparing overhead 20% (onderdeel van de 20% minder ambtenaren)', 'h1', 'S'),
 ('Taakstelling cultuur, instellingen en subsidies 40%', 'c2', 'S'),
 ('Ambtenarenapparaat 20%: vacaturestop en afstoten van taken (oplopend)', 'd_apparaat_rest', 'S'),
 ('Schrappen basisbanen 100%', 's6', 'S'),
 ('Klimaat- en energiebeleid (CDOKE) 60% (onderdeel van de 20%)', 'w12', 'S'),
 ('Taakstelling armoede- en minimaregelingen 30%', 's10', 'S'),
 ('Taakstelling individuele inkomenstoeslag 30%', 's12', 'S'),
 ('Concernposten 40%', 'g7', 'S'),
 ('Natuur- en duurzaamheidseducatie 100%', 'd6', 'S'),
 ('Extra geld mobiliteit (intensiveringsmiddelen) 25%', 'm3', 'S'),
 ('Bijzondere bijstand 25%', 's11', 'S'),
 ('Diversiteit en inclusie 85%', 'z10', 'S'),
 ('Extra geld energietransitie 40%', 'w7', 'S'),
 ('Uitvoering mobiliteitsvisie 55%', 'm4', 'S'),
 ('Strategisch bezit en grondzaken 35%', 'e7', 'S'),
 ('Minder wethouders 25%', 'g1', 'S'),
 ('Energiesubsidies 55%', 'w6', 'S'),
 ('Kettingeffect: meer begeleiding naar werk, minder bijstand', 'wia_reintegratie', 'S'),
 ('Aanpak Oosterhamrikzone 100%', 'm9', 'S'),
 ('Geen geld voor Campus Camera', 'p_campus_camera', 'S'),
 ('Kettingeffect: lager parkeertarief trekt meer bezoekers', 'ec_parkeren_elasticiteit', 'S'),
 ('Verplichte tegenprestatie in de bijstand (vanaf 2028)', 'k_tegenprestatie', 'S'),
 ('Verkoop 49% van WarmteStad: lagere rentelasten (vanaf 2028)', 'k_verkoop_warmtestad', 'S'),
 ('Kettingeffect: overhead werkplaats valt vrij (vanaf 2028)', 'kd_werkplaats', 'S'),
 ('Kettingeffect: meer jeugdpreventie, minder jeugdzorg (vanaf 2028)', 'zp_preventie_jeugd', 'S'),
 ('Stoppen met opvang ongedocumenteerden', 'k_ongedoc', 'I'),
 ('Geen gemeentegeld voor dierenartskosten', 'k_dierenarts', 'I'),
]
U = [
 ('Verlaging OZB 10% ten opzichte van 2026', 't1', 'S'),
 ('Extra investeren in beheer en onderhoud openbare ruimte 10%', 'o1', 'S'),
 ('Jeugdzorg 10% (achterstanden wegwerken)', 'z1', 'S'),
 ('Kettingeffect: subsidies afbouwen kost tijd', 'jur_subsidies', 'S'),
 ('Kortparkeren 10% goedkoper dan in 2026', 't5:kortparkeren', 'S'),
 ('Intensieve coaching, begeleiding naar werk 10%', 's3', 'S'),
 ('Versnellen Masterplan Sportvoorzieningen 2037', 'd_sport', 'S'),
 ('Kettingeffect: bedrijfsafval, gemiste marge en doorlopende kosten', 'kd_bedrijfsafval', 'S'),
 ('Parkeergarages 10% goedkoper dan in 2026', 't5:garages', 'S'),
 ('Zakelijke dienstverlening (werkplaats en bedrijfsafval) 100%', 'o4', 'S'),
 ('Afschaffen reclamebelasting', 't3', 'S'),
 ('Openbare orde en veiligheid (o.a. cameratoezicht) 10%', 'v3', 'S'),
 ('Parkeervergunningen 10% goedkoper dan in 2026', VERG, 'S'),
 ('Ruimere openingstijden milieustraten', 'd_milieustraten', 'S'),
 ('Verlaging toeristenbelasting 10% ten opzichte van 2026', 't2', 'S'),
 ('Extra boa’s 10%', 'v2', 'S'),
 ('Burgerzaken (extra) 5%', 'b1', 'S'),
 ('Jeugd en veiligheid 10%', 'v5', 'S'),
 ('Verlaging precariobelasting 10% ten opzichte van 2026', 't4', 'S'),
 ('Cameratoezicht binnenstad en stationsgebied: kapitaallasten', 'd_camera_invest', 'S'),
 ('Klantcontactcentrum (extra) 5%', 'b2', 'S'),
 ('Leefkwaliteit (groen en spelen in wijken) 5%', 'o6', 'S'),
 ('Cameratoezicht binnenstad en stationsgebied: uitkijken en onderhoud', 'd_camera_expl', 'S'),
 ('Ondermijning 10%', 'v4', 'S'),
 ('Afvalstoffen- en rioolheffing: geen extra doorberekening veegkosten', 'd_veegkosten', 'S'),
 ('Kettingeffect: restkosten na stoppen opvang ongedocumenteerden', 'zp_ongedocumenteerden', 'S'),
 ('Kettingeffect: minder gemeentefonds door minder bijstand (vanaf 2028)', 'rijk_verdeelmodel', 'S'),
 ('Kettingeffect: cultuur en toeristenbelasting (vanaf 2028)', 'ec_toerisme_cultuur', 'S'),
 ('Frictiekosten minder ambtenaren (eenmalig, globale schatting)', 'org_frictie', 'I'),
 ('Trainingscomplex FC Groningen (eenmalig)', 'd_fc', 'I'),
]
gebruikt = set()
for lst in (O, U):
    for _, ids, _s in lst:
        gebruikt.update([ids] if isinstance(ids, str) else ids)
ontbreekt = set(G) - gebruikt
assert not ontbreekt, ontbreekt
def rij(lst, teken):
    out = []
    for lab, ids, s in lst:
        # elke regel per jaar afronden op duizenden euro's; alle totalen zijn sommen van deze afgeronde regels
        vals = [q(teken * v(ids, j)) for j in range(4)]
        out.append(dict(label=lab, s=s, vals=vals, ids=[ids] if isinstance(ids, str) else ids))
    return out
RO = rij(O, 1); RU = rij(U, -1)
for r in RO + RU:
    assert all(x >= -D('0.0005') for x in r['vals']), (r['label'], r['vals'])
tot = lambda rows, j, s=None: sum(r['vals'][j] for r in rows if s is None or r['s'] == s)
oS = [tot(RO, j, 'S') for j in range(4)]; oI = [tot(RO, j, 'I') for j in range(4)]
uS = [tot(RU, j, 'S') for j in range(4)]; uI = [tot(RU, j, 'I') for j in range(4)]
sal = [oS[j] + oI[j] - uS[j] - uI[j] for j in range(4)]
salS = [oS[j] - uS[j] for j in range(4)]; salI = [oI[j] - uI[j] for j in range(4)]
KET = {'wia_reintegratie', 'ec_parkeren_elasticiteit', 'kd_werkplaats', 'zp_preventie_jeugd', 'jur_subsidies',
       'kd_bedrijfsafval', 'zp_ongedocumenteerden', 'rijk_verdeelmodel', 'ec_toerisme_cultuur', 'org_frictie'}
ket = [sum((r['vals'][j] if r in RO else -r['vals'][j]) for r in RO + RU if set(r['ids']) & KET) for j in range(4)]
cum = []; c = D(0)
for s in sal: c += s; cum.append(c)
ONTTREKKING = -sal[0] if sal[0] < 0 else D(0)
# Verkoop 49% WarmteStad tegen boekwaarde: opbrengst en aflossing lening even groot (geen effect op het saldo)
WS = D('37.975')
oI_tab = [oI[0] + WS] + oI[1:]
uI_tab = [uI[0] + WS] + uI[1:]
STORTING = sal[0] if sal[0] > 0 else D(0)
if __name__ == '__main__':
    print('2027 ombuigingen', fmt(oS[0] + oI[0]), 'uitgaven', fmt(uS[0] + uI[0]), 'saldo', fmt(sal[0]))
    for j in range(4):
        print(2027 + j, 'oS', fmt(oS[j]), 'oI', fmt(oI[j]), 'uS', fmt(uS[j]), 'uI', fmt(uI[j]), 'saldo', fmt(sal[j]),
              'S', fmt(salS[j]), 'I', fmt(salI[j]), 'ket', fmt(ket[j]), 'cum', fmt(cum[j]))
    print('onttrekking 2027', fmt(ONTTREKKING), 'storting 2027', fmt(STORTING))
    print('met WarmteStad: ombuigingen 2027', fmt(oS[0] + oI_tab[0]), 'uitgaven 2027', fmt(uS[0] + uI_tab[0]), 'totaal tabellen', fmt(oS[0] + oI_tab[0] + ONTTREKKING))
    # afrondingscontrole tabellen 2027
    dO = sum(q(r['vals'][0]) for r in RO); dU = sum(q(r['vals'][0]) for r in RU)
    print('weergave-som O', dO, 'exact', q(oS[0] + oI[0]), '| U', dU, 'exact', q(uS[0] + uI[0]))
