"""Independent check of the circuit solver.

    node src/components/circuit/test-circuit-solver.ts cases.json && python3 scripts/check_circuit_solver.py cases.json

Builds its own netlist from the grid geometry (ends at one node connect; an end on the interior of a wire
connects to it; crossings do not) and solves it by modified nodal analysis with numpy: ideal conductors
(wires, ammeters, closed keys, intact fuses, a rheostat at 0 Ом) are 0 В voltage sources with their own
current unknowns, a source is an ideal EMF in series with R_INT, the voltmeter is 1 МОм. Every
connected part of the circuit gets its own ground. Loops of ideal conductors make the system
singular in their circulating currents only; then lstsq picks the minimum-norm currents, which leaves the
potentials and every reading outside such loops exact. Compares all readings with the solver's ones.
"""
import json
import sys

import numpy as np

R_INT, R_VM = 1e-5, 1e6


def inside(p, a, b):
    if a[1] == b[1] == p[1]:
        return min(a[0], b[0]) < p[0] < max(a[0], b[0])
    if a[0] == b[0] == p[0]:
        return min(a[1], b[1]) < p[1] < max(a[1], b[1])
    return False


def solve(els):
    ends = {tuple(e[k]) for e in els for k in 'ab'}
    branches = []  # (kind, id, a, b, value)
    for e in els:
        a, b = tuple(e['a']), tuple(e['b'])
        k = e['kind']
        if k == 'wire':
            taps = sorted((p for p in ends if inside(p, a, b)), key=lambda p: abs(p[0] - a[0]) + abs(p[1] - a[1]))
            pts = [a, *taps, b]
            for p, q in zip(pts, pts[1:]):
                branches.append(('ideal', None, p, q, 0))
            continue
        if (k == 'key' and not e.get('closed')) or (k in ('lamp', 'fuse') and e.get('broken')):
            continue
        if k in ('ammeter', 'key', 'fuse') or (k == 'rheostat' and e['v'] == 0):
            branches.append(('ideal', e['id'], a, b, 0))
        elif k == 'source':
            branches.append(('emf', e['id'], a, b, e['v']))
        elif k == 'voltmeter':
            branches.append(('res', e['id'], a, b, R_VM))
        else:
            branches.append(('res', e['id'], a, b, e['v']))
    nodes = sorted({p for br in branches for p in br[2:4]} | ends)
    # a source = EMF between its «−» and an inner node, then R_INT to its «+»
    inner = {}
    for i, br in enumerate(branches):
        if br[0] == 'emf':
            inner[i] = ('in', i)
            nodes.append(inner[i])
    ix = {p: k for k, p in enumerate(nodes)}
    # connected parts: one grounded node each
    parent = list(range(len(nodes)))

    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x

    for i, br in enumerate(branches):
        pa, pb = ix[br[2]], ix[br[3]]
        if br[0] == 'emf':
            parent[find(ix[inner[i]])] = find(pa)
        parent[find(pa)] = find(pb)
    ground = {}
    for k in range(len(nodes)):
        ground.setdefault(find(k), k)
    grounded = set(ground.values())
    unk = [k for k in range(len(nodes)) if k not in grounded]
    row = {k: r for r, k in enumerate(unk)}
    vsrc = [i for i, br in enumerate(branches) if br[0] in ('ideal', 'emf')]
    n, m = len(unk), len(vsrc)
    A = np.zeros((n + m, n + m))
    z = np.zeros(n + m)

    def stamp_g(p, q, g):
        for u, v, s in ((p, p, 1), (q, q, 1), (p, q, -1), (q, p, -1)):
            if u in row and v in row:
                A[row[u], row[v]] += s * g

    for i, br in enumerate(branches):
        if br[0] == 'res':
            stamp_g(ix[br[2]], ix[br[3]], 1 / br[4])
        if br[0] == 'emf':
            stamp_g(ix[inner[i]], ix[br[2]], 1 / R_INT)
    # voltage sources: ideal: V(a) - V(b) = 0 ; emf: V(inner) - V(b) = U ; current unknown flows a(inner) -> b inside
    for j, i in enumerate(vsrc):
        br = branches[i]
        p = ix[inner[i]] if br[0] == 'emf' else ix[br[2]]
        q = ix[br[3]]
        c = n + j
        if p in row:
            A[row[p], c] += 1
            A[c, row[p]] += 1
        if q in row:
            A[row[q], c] -= 1
            A[c, row[q]] -= 1
        z[c] = br[4] if br[0] == 'emf' else 0
    if not n + m:
        x = np.zeros(0)
    elif np.linalg.matrix_rank(A) == n + m:
        x = np.linalg.solve(A, z)  # LU: more accurate than lstsq when the system is regular
    else:
        x = np.linalg.lstsq(A, z, rcond=None)[0]
    res = np.abs(A @ x - z).max() if n + m else 0
    V = {p: (x[row[ix[p]]] if ix[p] in row else 0.0) for p in nodes}
    I = {}
    for j, i in enumerate(vsrc):
        br = branches[i]
        if br[1] is not None:
            I[br[1]] = x[n + j]  # from a to b (for a source: from inner(+ side) to «−» inside? see below)
    for br in branches:
        if br[0] == 'res':
            I[br[1]] = (V[br[2]] - V[br[3]]) / br[4]
    # a source's MNA current flows inner -> «−» (b) inside, i.e. a -> b through the source: same sign convention
    out = {}
    for e in els:
        if e['kind'] == 'wire':
            continue
        out[f"I:{e['id']}"] = I.get(e['id'], 0.0)
        a, b = tuple(e['a']), tuple(e['b'])
        if e['kind'] == 'voltmeter':
            out[f"V:{e['id']}"] = V[a] - V[b]
        if e['kind'] == 'lamp':
            out[f"P:{e['id']}"] = 0.0 if e.get('broken') else (V[a] - V[b]) ** 2 / e['v']
    shorted = [e['id'] for e in els if e['kind'] == 'source' and abs(out[f"I:{e['id']}"]) * R_INT > 0.1 * e['v']]
    return out, shorted, res


def main():
    cases = json.load(open(sys.argv[1]))
    fails = 0
    for c in cases:
        ref, shorted, res = solve(c['els'])
        bad = []
        for k, v in ref.items():
            g = c['got'][k]
            tol = 1e-4 * abs(v) if abs(v) > 100 else 1e-6
            if abs(g - v) > tol:
                bad.append(f'{k}: python {v:.6g}, solver {g:.6g}')
        if sorted(shorted) != sorted(c['shorted']):
            bad.append(f"short: python {shorted}, solver {c['shorted']}")
        shown = ', '.join(f'{k}={v:.4g}' for k, v in ref.items() if k[0] in 'VP' or abs(v) > 1e-9)
        print(f"{'FAIL' if bad else 'ok  '} {c['name']}: {shown}  (residual {res:.1e})")
        for b in bad:
            print('     ', b)
        fails += bool(bad)
    print(f'{fails} case(s) differ' if fails else f'all {len(cases)} cases agree')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
