/**
 * Exact DC solution of a circuit drawn on a grid (shared by the circuit constructor and its tests).
 *
 * Every element is a straight segment between two grid nodes a and b. Ends at the same node are connected;
 * an end lying on the interior of a wire connects to it (T-junction); wires that merely cross do not connect.
 *
 * Model. Wires, ammeters, closed keys, intact fuses and a rheostat at 0 Ом are ideal conductors (0 Ом):
 * the nodes they join form one "supernode" with one potential. Lamps, resistors and the rheostat are
 * resistances, the voltmeter is 1 МОм, a source is an EMF U with a hidden internal resistance R_INT.
 * Nodal analysis on the supernodes (one grounded node per connected part of the circuit, Gaussian
 * elimination with partial pivoting) gives the potentials; the currents in the ideal conductors are then
 * found inside each supernode as the limit of equal tiny resistances (∝ length): a second small nodal
 * problem with the currents of the other elements as injections.
 *
 * A source is short-circuited when its internal resistance takes a noticeable part of its EMF,
 * i.e. when an (almost) zero-resistance path joins its poles.
 */
export type Kind = 'source' | 'key' | 'lamp' | 'resistor' | 'rheostat' | 'ammeter' | 'voltmeter' | 'fuse' | 'wire';
export type P = [number, number];
export interface El {
	id: number;
	kind: Kind;
	a: P;
	b: P;
	/** U for a source, R for a lamp / resistor / rheostat, the rated current for a fuse */
	v: number;
	/** key: closed */
	closed?: boolean;
	/** lamp burnt out, fuse blown */
	broken?: boolean;
	/** number of the part among the parts of its kind («Лампа 2») */
	n?: number;
}

export const R_INT = 1e-5; // Ом, hidden internal resistance of a source
export const R_VOLTMETER = 1e6; // Ом
export const SHORT_SHARE = 0.1; // a source is shorted when I·R_INT > 0.1·U

export interface Piece {
	id: number; // the wire
	a: P;
	b: P;
	I: number; // current from a to b, А
}
export interface Solution {
	/** potential of a grid node, В (0 for a node that is not an end of anything) */
	phi: (p: P) => number;
	/** current through a part from its end a to its end b, А (wires: see pieces) */
	I: Map<number, number>;
	/** wires split at their T-junctions, with currents */
	pieces: Piece[];
	/** ids of short-circuited sources */
	shorted: number[];
}

export const key = (p: P) => `${p[0]},${p[1]}`;
export const same = (p: P, q: P) => p[0] === q[0] && p[1] === q[1];
/** p lies strictly inside the axis-parallel segment ab */
export const inside = (p: P, a: P, b: P) => {
	if (a[1] === b[1] && p[1] === a[1]) return p[0] > Math.min(a[0], b[0]) && p[0] < Math.max(a[0], b[0]);
	if (a[0] === b[0] && p[0] === a[0]) return p[1] > Math.min(a[1], b[1]) && p[1] < Math.max(a[1], b[1]);
	return false;
};
export const len = (a: P, b: P) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/** wires split at every end of another element lying on their interior */
export const splitWires = (els: El[]): { id: number; a: P; b: P }[] => {
	const ends = els.flatMap((e) => [e.a, e.b]);
	const out: { id: number; a: P; b: P }[] = [];
	for (const w of els) {
		if (w.kind !== 'wire') continue;
		const taps = new Map<string, P>();
		for (const p of ends) if (inside(p, w.a, w.b)) taps.set(key(p), p);
		const pts = [w.a, ...[...taps.values()].sort((p, q) => len(w.a, p) - len(w.a, q)), w.b];
		for (let k = 0; k + 1 < pts.length; k++) out.push({ id: w.id, a: pts[k], b: pts[k + 1] });
	}
	return out;
};

/** Gaussian elimination with partial pivoting; A is n×n (modified), returns x of A x = rhs */
export const gauss = (A: number[][], rhs: number[]): number[] => {
	const n = rhs.length;
	const M = A.map((row, k) => [...row, rhs[k]]);
	for (let c = 0; c < n; c++) {
		let piv = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
		[M[c], M[piv]] = [M[piv], M[c]];
		const d = M[c][c];
		if (d === 0) continue; // cannot happen for a connected network with a grounded node
		for (let r = c + 1; r < n; r++) {
			const f = M[r][c] / d;
			if (f === 0) continue;
			for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
		}
	}
	const x = new Array<number>(n).fill(0);
	for (let r = n - 1; r >= 0; r--) {
		let s = M[r][n];
		for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
		x[r] = M[r][r] === 0 ? 0 : s / M[r][r];
	}
	return x;
};

class DSU {
	p: number[];
	constructor(n: number) {
		this.p = Array.from({ length: n }, (_, k) => k);
	}
	find(x: number): number {
		while (this.p[x] !== x) x = this.p[x] = this.p[this.p[x]];
		return x;
	}
	join(a: number, b: number) {
		this.p[this.find(a)] = this.find(b);
	}
}

/** does the element conduct at all, and is it an ideal (0 Ом) conductor? */
export const conducts = (e: El) => !((e.kind === 'key' && !e.closed) || ((e.kind === 'lamp' || e.kind === 'fuse') && e.broken));
export const isIdeal = (e: El) =>
	e.kind === 'wire' || e.kind === 'ammeter' || e.kind === 'key' || e.kind === 'fuse' || (e.kind === 'rheostat' && e.v <= 1e-9);
const conductance = (e: El) => (e.kind === 'voltmeter' ? 1 / R_VOLTMETER : 1 / e.v);

export const solve = (els: El[]): Solution => {
	// ----- grid nodes -----
	const idx = new Map<string, number>();
	const pts: P[] = [];
	const at = (p: P) => {
		const k = key(p);
		let i = idx.get(k);
		if (i === undefined) {
			i = pts.length;
			idx.set(k, i);
			pts.push(p);
		}
		return i;
	};
	els.forEach((e) => (at(e.a), at(e.b)));
	const N = pts.length;

	// ----- branches -----
	type Br = { id: number; i: number; j: number; ideal: boolean; g: number; U: number; length: number; wire: boolean; a: P; b: P };
	const brs: Br[] = [];
	for (const w of splitWires(els))
		brs.push({ id: w.id, i: at(w.a), j: at(w.b), ideal: true, g: 0, U: 0, length: len(w.a, w.b), wire: true, a: w.a, b: w.b });
	for (const e of els) {
		if (e.kind === 'wire' || !conducts(e)) continue;
		const base = { id: e.id, i: at(e.a), j: at(e.b), length: len(e.a, e.b), wire: false, a: e.a, b: e.b };
		if (e.kind === 'source') brs.push({ ...base, ideal: false, g: 1 / R_INT, U: e.v });
		else if (isIdeal(e)) brs.push({ ...base, ideal: true, g: 0, U: 0 });
		else brs.push({ ...base, ideal: false, g: conductance(e), U: 0 });
	}

	// ----- supernodes (joined by ideal conductors) and connected parts -----
	const sn = new DSU(N);
	for (const b of brs) if (b.ideal) sn.join(b.i, b.j);
	const S = (i: number) => sn.find(i);
	const comp = new DSU(N);
	for (const b of brs) comp.join(S(b.i), S(b.j));
	const unknown = new Map<number, number>(); // supernode root -> row
	const grounded = new Set<number>();
	for (let i = 0; i < N; i++) {
		const s = S(i);
		if (unknown.has(s) || grounded.has(s)) continue;
		const c = comp.find(s);
		// the first supernode met in every connected part is grounded
		if (![...grounded].some((g) => comp.find(g) === c)) grounded.add(s);
		else unknown.set(s, unknown.size);
	}
	const n = unknown.size;
	const G = Array.from({ length: n }, () => new Array<number>(n).fill(0));
	const rhs = new Array<number>(n).fill(0);
	const add = (s: number, t: number, v: number) => {
		const r = unknown.get(s);
		const c = unknown.get(t);
		if (r !== undefined && c !== undefined) G[r][c] += v;
	};
	for (const b of brs) {
		if (b.ideal) continue;
		const si = S(b.i);
		const sj = S(b.j);
		add(si, si, b.g);
		add(sj, sj, b.g);
		add(si, sj, -b.g);
		add(sj, si, -b.g);
		// the source pushes current g·U from its «−» (b) to its «+» (a) inside it
		const ri = unknown.get(si);
		const rj = unknown.get(sj);
		if (ri !== undefined) rhs[ri] += b.g * b.U;
		if (rj !== undefined) rhs[rj] -= b.g * b.U;
	}
	const x = n ? gauss(G, rhs) : [];
	const V = (i: number) => {
		const r = unknown.get(S(i));
		return r === undefined ? 0 : x[r];
	};

	// ----- currents in the non-ideal branches (from a to b) -----
	const I = new Map<number, number>();
	const inj = new Array<number>(N).fill(0); // current flowing into a node from non-ideal branches
	const shorted: number[] = [];
	for (const b of brs) {
		if (b.ideal) continue;
		const i = b.g * (V(b.i) - V(b.j)) - b.g * b.U;
		I.set(b.id, i);
		inj[b.i] -= i;
		inj[b.j] += i;
		if (b.U && Math.abs(i) * R_INT > SHORT_SHARE * b.U) shorted.push(b.id);
	}

	// ----- currents in the ideal conductors: inside every supernode, as equal tiny resistances ∝ length -----
	const groups = new Map<number, Br[]>();
	for (const b of brs) if (b.ideal) groups.set(S(b.i), [...(groups.get(S(b.i)) ?? []), b]);
	const pieces: Piece[] = [];
	for (const list of groups.values()) {
		const loc = new Map<number, number>();
		for (const b of list) for (const i of [b.i, b.j]) if (!loc.has(i)) loc.set(i, loc.size);
		const m = loc.size - 1; // the first node is grounded
		const L = Array.from({ length: m }, () => new Array<number>(m).fill(0));
		const r = new Array<number>(m).fill(0);
		for (const [i, k] of loc) if (k > 0) r[k - 1] = inj[i];
		for (const b of list) {
			const g = 1 / Math.max(b.length, 1);
			const p = loc.get(b.i)! - 1;
			const q = loc.get(b.j)! - 1;
			if (p >= 0) L[p][p] += g;
			if (q >= 0) L[q][q] += g;
			if (p >= 0 && q >= 0) {
				L[p][q] -= g;
				L[q][p] -= g;
			}
		}
		const y = m ? gauss(L, r) : [];
		const u = (i: number) => {
			const k = loc.get(i)!;
			return k === 0 ? 0 : y[k - 1];
		};
		for (const b of list) {
			const i = (u(b.i) - u(b.j)) / Math.max(b.length, 1);
			if (b.wire) pieces.push({ id: b.id, a: b.a, b: b.b, I: i });
			else I.set(b.id, i);
		}
	}
	for (const e of els) if (e.kind !== 'wire' && !I.has(e.id)) I.set(e.id, 0);

	return {
		phi: (p: P) => {
			const i = idx.get(key(p));
			return i === undefined ? 0 : V(i);
		},
		I,
		pieces,
		shorted,
	};
};
