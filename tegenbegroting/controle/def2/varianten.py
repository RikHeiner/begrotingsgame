from decimal import Decimal as D, ROUND_HALF_UP
q = lambda x: D(x).quantize(D('0.001'), rounding=ROUND_HALF_UP)
f = lambda x: (f'{q(x):.3f}'.rstrip('0').rstrip('.') if '.' in f'{q(x):.3f}' else f'{q(x)}').replace('.', ',')
def fmt(x):
    s = f'{q(x):.3f}'.rstrip('0')
    if s.endswith('.'): s += '0'
    return s.replace('.', ',').replace('-', '−')
base = dict(oS=[D('78.56'), D('90.705'), D('101.698'), D('111.386')], oI=[D('43.826'), D('5.0'), D(0), D(0)],
            uS=[D('77.133'), D('68.814'), D('69.045'), D('69.251')], uI=[D('6.105'), D(0), D(0), D(0)])
RENTE = (D('0.025') * D('37.975'))
def variant(c1=False, c2=False, c3=False, c4=False, c5=False):
    v = {k: list(x) for k, x in base.items()}
    if c1: v['oI'][0] -= D('37.975')
    if c2:
        for j in (1, 2, 3): v['oS'][j] += RENTE
    if c3: v['uI'][0] += D('8.403') - D('4.105')
    if c4: v['oI'][1] -= D('5.0')
    if c5:
        for j in range(4): v['oS'][j] += D('1.836'); v['uS'][j] += D('1.12')
    sal = [v['oS'][j] + v['oI'][j] - v['uS'][j] - v['uI'][j] for j in range(4)]
    S = [v['oS'][j] - v['uS'][j] for j in range(4)]; I = [v['oI'][j] - v['uI'][j] for j in range(4)]
    cum = []; c = D(0)
    for s in sal: c += s; cum.append(c)
    return v, sal, S, I, cum
if __name__ == '__main__':
    for naam, kw in [('document nu', {}), ('A: WarmteStad niet als baat', dict(c1=True)),
                     ('B: A + rentevoordeel', dict(c1=True, c2=True)),
                     ('C: B + frictie model 8,4', dict(c1=True, c2=True, c3=True)),
                     ('D: C + geen ongedoc 2028', dict(c1=True, c2=True, c3=True, c4=True)),
                     ('E: D + ontbrekende kettingeffecten', dict(c1=True, c2=True, c3=True, c4=True, c5=True))]:
        v, sal, S, I, cum = variant(**kw)
        print(f'{naam:<36}', 'saldo', [fmt(x) for x in sal], 'S', [fmt(x) for x in S], 'I', [fmt(x) for x in I], 'cum', fmt(cum[-1]), 'omb2027', fmt(v['oS'][0] + v['oI'][0]))
