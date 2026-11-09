# -*- coding: utf-8 -*-
"""Veilig bewerken van een Google-Docs-export (.docx): tekst kan over veel runs en sdt-blokken verspreid staan.
Vervangingen werken op alineaniveau over alle w:t-elementen heen (ook binnen w:sdt en w:hyperlink)."""
import re, shutil, os, zipfile
from lxml import etree

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def para_text(p):
    return ''.join(t.text or '' for t in p.iter(W + 't'))


class GDoc:
    def __init__(self, src_dir):
        self.dir = src_dir
        self.path = os.path.join(src_dir, 'word', 'document.xml')
        self.tree = etree.parse(self.path)
        self.root = self.tree.getroot()
        self.log = []

    def paragraphs(self):
        return list(self.root.iter(W + 'p'))

    def replace(self, old, new, count_expected=1, where=None):
        """Vervang `old` door `new` in alinea's (over runs heen). Controleert het verwachte aantal."""
        n = 0
        for p in self.paragraphs():
            txt = para_text(p)
            if where and where not in txt:
                continue
            while old in txt:
                self._replace_once(p, txt, old, new)
                n += 1
                txt = para_text(p)
                if old in new:
                    break
        if count_expected is not None and n != count_expected:
            raise SystemExit(f'VERWACHT {count_expected}x, GEVONDEN {n}x: {old[:80]!r}')
        self.log.append((old, new, n))
        return n

    @staticmethod
    def _replace_once(p, txt, old, new):
        start = txt.index(old)
        end = start + len(old)
        ts = list(p.iter(W + 't'))
        pos = 0
        first = True
        for t in ts:
            s = t.text or ''
            a, b = pos, pos + len(s)
            pos = b
            if b <= start or a >= end:
                continue
            lo = max(start, a) - a
            hi = min(end, b) - a
            if first:
                t.text = s[:lo] + new + s[hi:]
                first = False
            else:
                t.text = s[:lo] + s[hi:]
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')

    def set_cell(self, table_idx, row_label, col_idx, value):
        tbls = list(self.root.iter(W + 'tbl'))
        tbl = tbls[table_idx]
        for tr in tbl.findall(W + 'tr'):
            tcs = tr.findall(W + 'tc')
            if para_text(tcs[0]).strip() == row_label:
                tc = tcs[col_idx]
                ts = list(tc.iter(W + 't'))
                if not ts:
                    raise SystemExit(f'lege cel zonder w:t: {row_label} kolom {col_idx}')
                old = ''.join(t.text or '' for t in ts)
                ts[0].text = value
                for t in ts[1:]:
                    t.text = ''
                self.log.append((f'cel [{table_idx}] {row_label} k{col_idx}: {old}', value, 1))
                return old
        raise SystemExit(f'rij niet gevonden: {row_label}')

    def unwrap_sdt(self):
        n = 0
        for sdt in list(self.root.iter(W + 'sdt')):
            content = sdt.find(W + 'sdtContent')
            parent = sdt.getparent()
            idx = parent.index(sdt)
            for child in list(content):
                parent.insert(idx, child)
                idx += 1
            parent.remove(sdt)
            n += 1
        self.log.append(('sdt-blokken (Google-suggesties) uitgepakt', '', n))
        return n

    def save(self):
        self.tree.write(self.path, xml_declaration=True, encoding='UTF-8', standalone=True)


def strip_google_metadata(src_dir):
    """Verwijdert customXML (Google-roundtripdata met suggestie-ID's en auteursnaam) en verwijzingen ernaar."""
    removed = []
    cx = os.path.join(src_dir, 'customXML')
    if os.path.isdir(cx):
        shutil.rmtree(cx)
        removed.append('customXML/')
    ct = os.path.join(src_dir, '[Content_Types].xml')
    s = open(ct, encoding='utf-8').read()
    s2 = re.sub(r'<Override[^>]*PartName="/customXML/[^"]*"[^>]*/>', '', s, flags=re.I)
    if s2 != s:
        open(ct, 'w', encoding='utf-8').write(s2)
        removed.append('[Content_Types] customXML-overrides')
    for rels in ('_rels/.rels', 'word/_rels/document.xml.rels'):
        rp = os.path.join(src_dir, rels)
        if os.path.exists(rp):
            s = open(rp, encoding='utf-8').read()
            s2 = re.sub(r'<Relationship[^>]*Target="[^"]*customXML[^"]*"[^>]*/>', '', s, flags=re.I)
            if s2 != s:
                open(rp, 'w', encoding='utf-8').write(s2)
                removed.append(rels + ' customXML-relatie')
    return removed


def zip_dir(src_dir, out_path):
    if os.path.exists(out_path):
        os.remove(out_path)
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml eerst
        z.write(os.path.join(src_dir, '[Content_Types].xml'), '[Content_Types].xml')
        for base, _, files in os.walk(src_dir):
            for f in files:
                full = os.path.join(base, f)
                rel = os.path.relpath(full, src_dir)
                if rel == '[Content_Types].xml':
                    continue
                z.write(full, rel)


# ---- tabelbewerkingen ----
import copy as _copy

def _rows(self, table_idx):
    return list(list(self.root.iter(W + 'tbl'))[table_idx].findall(W + 'tr'))

def _label(tr):
    return para_text(tr.findall(W + 'tc')[0]).strip()

def find_row(self, table_idx, label, exact=True):
    hits = [tr for tr in _rows(self, table_idx) if (_label(tr) == label if exact else _label(tr).startswith(label))]
    if len(hits) != 1:
        raise SystemExit(f'rij {label!r} in tabel {table_idx}: {len(hits)} treffers')
    return hits[0]

def _set_tc(tc, value):
    ts = list(tc.iter(W + 't'))
    if not ts:
        # lege cel: maak een run met de opmaak van de alinea
        p = tc.find(W + 'p')
        r = etree.SubElement(p, W + 'r')
        t = etree.SubElement(r, W + 't')
        ts = [t]
    ts[0].text = value
    ts[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    for t in ts[1:]:
        t.text = ''

def set_row(self, table_idx, label, values, exact=True):
    tr = find_row(self, table_idx, label, exact)
    tcs = tr.findall(W + 'tc')
    old = [para_text(tc).strip() for tc in tcs]
    for tc, v in zip(tcs, values):
        if v is not None:
            _set_tc(tc, v)
    self.log.append((f'tabel {table_idx} rij: {" | ".join(old)}', ' | '.join(x if x is not None else old[i] for i, x in enumerate(values)), 1))

def delete_row(self, table_idx, label, exact=True):
    tr = find_row(self, table_idx, label, exact)
    old = ' | '.join(para_text(tc).strip() for tc in tr.findall(W + 'tc'))
    tr.getparent().remove(tr)
    self.log.append((f'tabel {table_idx} rij verwijderd: {old}', '', 1))

def insert_row_after(self, table_idx, after_label, template_label, values):
    ref = find_row(self, table_idx, after_label)
    tpl = find_row(self, table_idx, template_label)
    new = _copy.deepcopy(tpl)
    for el in new.iter():
        for a in list(el.attrib):
            if a.endswith('}paraId') or a.endswith('}textId'):
                del el.attrib[a]
    for tc, v in zip(new.findall(W + 'tc'), values):
        _set_tc(tc, v)
    ref.addnext(new)
    self.log.append((f'tabel {table_idx} rij toegevoegd na {after_label!r}', ' | '.join(values), 1))
    return new

GDoc.find_row = find_row
GDoc.set_row = set_row
GDoc.delete_row = delete_row
GDoc.insert_row_after = insert_row_after
