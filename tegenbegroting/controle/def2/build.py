# -*- coding: utf-8 -*-
"""Bouwt de gecorrigeerde definitieve versie. Gebruik: python3 -I build.py <werkmap>"""
import sys, os, shutil, json, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gdoc import GDoc, strip_google_metadata, zip_dir, para_text, W
from apply_fin import apply_fin

work = sys.argv[1]
SRC = os.path.join(HERE, '..', 'src')
OUT = os.path.join(work, 'out')
DOCX = os.path.join(work, '20261111_Tegenbegroting_2027_VVD_Groningen_DEF_2.docx')
toc_file = os.path.join(work, 'toc.json')

def build(toc=None):
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)
    removed = strip_google_metadata(OUT)
    d = GDoc(OUT)
    d.unwrap_sdt()
    zeker = []
    for f in ('zeker_eigen.json', 'zeker_agent.json'):
        p = os.path.join(HERE, f)
        if os.path.exists(p):
            zeker += json.load(open(p, encoding='utf-8'))
    for it in zeker:
        d.replace(it['oud'], it['nieuw'], it.get('aantal', 1))
    info = apply_fin(d)
    if toc:
        set_toc(d, toc)
    d.save()
    cov = os.path.join(HERE, '..', 'covers')
    shutil.copy(os.path.join(cov, 'besparingen_01.jpg'), os.path.join(OUT, 'word', 'media', 'image3.jpg'))
    shutil.copy(os.path.join(cov, 'financieel_04.jpg'), os.path.join(OUT, 'word', 'media', 'image7.jpg'))
    zip_dir(OUT, DOCX)
    return d, removed, info

def toc_paragraphs(d):
    out = []
    for p in d.root.iter(W + 'p'):
        h = p.find(W + 'hyperlink')
        if h is None:
            continue
        titel = ''.join(t.text or '' for t in h.iter(W + 't')).strip()
        out.append((titel, p))
        if titel.startswith('Meerjarenbegroting'):
            break
    return out

def set_toc(d, toc):
    for titel, p in toc_paragraphs(d):
        if titel not in toc:
            continue
        nums = [t for r in p.findall(W + 'r') for t in r.findall(W + 't') if (t.text or '').strip().isdigit()]
        if nums:
            nums[-1].text = str(toc[titel])
        d.log.append((f'inhoudsopgave {titel}', str(toc[titel]), 1))

def render():
    pdfdir = os.path.join(work, 'pdf')
    os.makedirs(pdfdir, exist_ok=True)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', pdfdir, DOCX],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=240)
    return os.path.join(pdfdir, os.path.basename(DOCX).replace('.docx', '.pdf'))

def pages_of_headings(pdf, titels):
    import pdfplumber
    p = pdfplumber.open(pdf)
    pages = [(pg.extract_text() or '').split('\n') for pg in p.pages]
    res = {}
    zoek = {'Fractie': 'Fractie.', 'Besparingen': 'Besparingen.', 'Investeringen': 'Investeringen.',
            'Een financieel gezonde gemeente': 'Een financieel gezonde gemeente.', 'Financieel overzicht': 'Financieel overzicht.',
            'Een slanke en efficiënte gemeente': 'Een slanke en efficiënte gemeente'}
    for t in titels:
        z = zoek.get(t, t)
        for i, lines in enumerate(pages):
            if i < 2:
                continue
            if any(l.strip().startswith(z) for l in lines):
                res[t] = i + 1
                break
    return res, len(pages)

if __name__ == '__main__':
    d, removed, info = build()
    titels = [t for t, _ in toc_paragraphs(d)]
    pdf = render()
    toc, n = pages_of_headings(pdf, titels)
    d, removed, info = build(toc)
    pdf = render()
    toc2, n2 = pages_of_headings(pdf, titels)
    assert toc == toc2, (toc, toc2)
    json.dump({'toc': toc, 'paginas': n2, 'verwijderd': removed, 'log': d.log,
               'omb2027': str(info['omb2027']), 'cum2030': str(info['cum2030'])},
              open(os.path.join(work, 'buildlog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('klaar:', DOCX, '| pagina\'s', n2, '| toc', toc)
    print('ombuigingen 2027 (cover 01):', info['omb2027'], '| cumulatief 2030 (cover 04):', info['cum2030'])
