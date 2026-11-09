import sys, copy, re, json, os, shutil
from lxml import etree
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
src, out, cov = sys.argv[1], sys.argv[2], sys.argv[3]
toc = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
if os.path.exists(out): shutil.rmtree(out)
shutil.copytree(src, out)
shutil.copy(f'{cov}/financieel_gezond_03.jpg', f'{out}/word/media/image7.jpg')
shutil.copy(f'{cov}/financieel_04.jpg', f'{out}/word/media/image2.jpg')
rels = open(f'{out}/word/_rels/document.xml.rels', encoding='utf-8').read()
rels = rels.replace('</Relationships>', '<Relationship Id="rId900" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image7.jpg"/></Relationships>')
open(f'{out}/word/_rels/document.xml.rels', 'w', encoding='utf-8').write(rels)

t = etree.parse(f'{out}/word/document.xml'); body = t.getroot().find(W + 'body')
txt = lambda e: ''.join(e.itertext()).strip()
ps = list(body)
kop = next(p for p in ps if p.tag == W + 'p' and txt(p) == 'Een financieel gezonde Gemeente.')
fo_cover = next(p for p in ps if p.tag == W + 'p' and p.find(f'{W}pPr/{W}sectPr') is not None and p.find('.//' + WP + 'anchor') is not None and ps.index(p) > ps.index(kop))
# laatste niet-lege alinea voor de kop
i = ps.index(kop) - 1
leeg = []
while txt(ps[i]) == '' and ps[i].find('.//' + W + 'drawing') is None:
    leeg.append(ps[i]); i -= 1
laatste = ps[i]
for p in leeg: body.remove(p)
# sectie afsluiten na Investeringen (zelfde sectPr als het einde van dit deel)
eind = fo_cover.getprevious()
while eind.find(f'{W}pPr/{W}sectPr') is None: eind = eind.getprevious()
sp = copy.deepcopy(eind.find(f'{W}pPr/{W}sectPr'))
ppr = laatste.find(W + 'pPr')
if ppr is None:
    ppr = etree.SubElement(laatste, W + 'pPr'); laatste.insert(0, ppr)
ppr.append(sp)
# voorblad invoegen (kopie van het voorblad Financieel overzicht)
nieuw = copy.deepcopy(fo_cover)
for a in list(nieuw.attrib):
    if 'paraId' in a: del nieuw.attrib[a]
nieuw.find('.//' + A + 'blip').set(R + 'embed', 'rId900')
dp = nieuw.find('.//' + WP + 'docPr'); dp.set('id', '1800976900'); dp.set('name', 'image7.jpg')
for c in nieuw.iter('{http://schemas.openxmlformats.org/drawingml/2006/picture}cNvPr'): c.set('name', 'image7.jpg')
kop.addprevious(nieuw)
# bladwijzer op de kop
runs = [r for r in kop.findall(W + 'r') if r.find(W + 't') is not None and 'financieel' in (r.find(W + 't').text or '')]
bs = etree.Element(W + 'bookmarkStart'); bs.set(W + 'id', '901'); bs.set(W + 'name', 'k_financieel_gezond')
be = etree.Element(W + 'bookmarkEnd'); be.set(W + 'id', '901')
runs[0].addprevious(bs); runs[0].addnext(be)
# inhoudsopgave
tocps = [p for p in body if p.tag == W + 'p' and p.find(W + 'hyperlink') is not None and ps.index(p) < 20] if False else None
def tocpara(anchor):
    for p in body.iter(W + 'p'):
        h = p.find(W + 'hyperlink')
        if h is not None and h.get(W + 'anchor') == anchor: return p
fo_toc = tocpara('k_financieel_overzicht')
ent = copy.deepcopy(fo_toc)
for a in list(ent.attrib):
    if 'paraId' in a: del ent.attrib[a]
ent.find(W + 'hyperlink').set(W + 'anchor', 'k_financieel_gezond')
ent.find(f'{W}hyperlink/{W}r/{W}t').text = 'Een financieel gezonde gemeente'
fo_toc.addprevious(ent)
# ontbrekend paginanummer bij 'Investeren in de toekomst van Groningen'
toek = tocpara('k_investeren_in_de_toekomst_van_')
if not any((x.text or '').strip().isdigit() for x in toek.iter(W + 't')):
    ref = toek.getprevious()  # level-2 regel met nummer
    numrun = copy.deepcopy([r for r in ref.findall(W + 'r') if r.find(W + 'tab') is not None][0])
    toek.find(W + 'hyperlink').addnext(numrun)
# paginanummers invullen
for p in body.iter(W + 'p'):
    h = p.find(W + 'hyperlink')
    if h is None: continue
    titel = ''.join(h.itertext()).strip()
    if titel in toc:
        nums = [r for r in p.findall(W + 'r') if r.find(W + 'tab') is not None]
        if nums: nums[0].find(W + 't').text = str(toc[titel])
t.write(f'{out}/word/document.xml', xml_declaration=True, encoding='UTF-8', standalone=True)
print('ok')
