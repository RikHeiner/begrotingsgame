import sys, zipfile
from lxml import etree
from decimal import Decimal as D
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
z=zipfile.ZipFile(sys.argv[1]); root=etree.fromstring(z.read('word/document.xml'))
txt=lambda e: ''.join(t.text or '' for t in e.iter(W+'t')).strip()
num=lambda s: D(s.replace(',','.').replace('−','-')) if s not in ('','PM') else D(0)
tbls=list(root.iter(W+'tbl')); fouten=[]
som={}
for ti in (0,1):
    S=I=D(0)
    for tr in tbls[ti].findall(W+'tr')[1:]:
        c=[txt(tc) for tc in tr.findall(W+'tc')]
        if c[0]=='Totaal': tot=num(c[1]); continue
        if c[2]=='S': S+=num(c[1])
        elif c[2]=='I': I+=num(c[1])
        else: fouten.append(f'geen S/I: {c}')
    som[ti]=(S,I)
    if S+I!=tot: fouten.append(f'tabel {ti}: som {S+I} <> Totaal {tot}')
mj={}
for tr in tbls[2].findall(W+'tr')[1:]:
    c=[txt(tc) for tc in tr.findall(W+'tc')]; mj[c[0]]=[num(x) for x in c[1:]]
k=mj.get; cum=D(0)
for j in range(4):
    oS,oI=k('Ombuigingen en opbrengsten, structureel')[j],k('Ombuigingen en opbrengsten, incidenteel')[j]
    uS,uI=k('Uitgaven, structureel')[j],k('Uitgaven, incidenteel (excl. storting reserves)')[j]
    for naam, a, b in [('totaal omb', oS+oI, k('Totaal ombuigingen en opbrengsten')[j]), ('totaal uitg', uS+uI, k('Totaal uitgaven')[j]),
                       ('saldo', oS+oI-uS-uI, k('Saldo')[j]), ('w.v. S', oS-uS, k('waarvan structureel')[j]), ('w.v. I', oI-uI, k('waarvan incidenteel')[j])]:
        if a!=b: fouten.append(f'{2027+j} {naam}: {a} <> {b}')
    cum+=k('Saldo')[j]
    if cum!=k('Cumulatief saldo')[j]: fouten.append(f'{2027+j} cumulatief {cum} <> {k("Cumulatief saldo")[j]}')
S0,I0=som[0]; S1,I1=som[1]
if S0!=k('Ombuigingen en opbrengsten, structureel')[0]: fouten.append('omb S 2027 jaartabel <> meerjaren')
if I0!=k('Ombuigingen en opbrengsten, incidenteel')[0]: fouten.append('omb I 2027 jaartabel <> meerjaren')
if S1!=k('Uitgaven, structureel')[0]: fouten.append(f'uitg S 2027 jaartabel {S1} <> meerjaren {k("Uitgaven, structureel")[0]}')
stort = I1 - k('Uitgaven, incidenteel (excl. storting reserves)')[0]
if stort != k('Saldo')[0]: fouten.append(f'storting 2027 {stort} <> saldo 2027 {k("Saldo")[0]}')
print('FOUTEN:' if fouten else 'ALLE CONTROLES KLOPPEN', *fouten, sep='\n  ')
print('2027: omb', S0+I0, 'uitg excl storting', S1+I1-stort, 'storting', stort, '| cumulatief', cum)
