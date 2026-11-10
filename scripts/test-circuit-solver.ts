/**
 * Tests of the circuit solver: node scripts/test-circuit-solver.ts [cases.json]
 * Checks hand-computed values; with a file name it also writes every case with the solver's readings,
 * which check_circuit_solver.py recomputes independently (its own netlist and modified nodal analysis in numpy).
 */
import { writeFileSync } from 'node:fs';
import { solve, type El, type Kind, type P } from '../src/components/circuit/solver.ts';

let id = 0;
const e = (kind: Kind, a: P, b: P, v = 0, more: Partial<El> = {}): El => ({ id: ++id, kind, a, b, v, ...more });
const W = (a: P, b: P) => e('wire', a, b);

type Case = { name: string; els: El[]; expect: Record<string, number>; short?: boolean };
const cases: Case[] = [];
const add = (name: string, els: El[], expect: Record<string, number>, short = false) => cases.push({ name, els, expect, short });

// readings by label: 'A:<id>' ammeter current a→b, 'V:<id>' voltmeter φa − φb, 'P:<id>' lamp power, 'I:<id>' part current
const read = (els: El[]) => {
	const s = solve(els);
	const out: Record<string, number> = {};
	for (const el of els) {
		if (el.kind === 'wire') continue;
		const I = s.I.get(el.id) ?? 0;
		out[`I:${el.id}`] = I;
		if (el.kind === 'voltmeter') out[`V:${el.id}`] = s.phi(el.a) - s.phi(el.b);
		if (el.kind === 'lamp') out[`P:${el.id}`] = el.broken ? 0 : (s.phi(el.a) - s.phi(el.b)) ** 2 / el.v;
	}
	return { out, s };
};

// 1. series: + at (2,5) → left rail → lamp 1 → ammeter → lamp 2 → right rail → «−» at (4,5); voltmeter on lamp 1
{
	id = 0;
	const els = [
		e('source', [2, 5], [4, 5], 6),
		W([0, 5], [2, 5]),
		W([0, 1], [0, 5]),
		e('lamp', [0, 1], [2, 1], 12),
		e('ammeter', [2, 1], [4, 1]),
		e('lamp', [4, 1], [6, 1], 12),
		W([6, 1], [6, 5]),
		W([4, 5], [6, 5]),
		e('voltmeter', [0, 0], [2, 0]),
		W([0, 0], [0, 1]),
		W([2, 0], [2, 1]),
	];
	add('series, two lamps 12 Ом on 6 В', els, { 'I:5': 0.25, 'V:9': 3, 'P:4': 0.75, 'P:6': 0.75 });
}
// 2. parallel: two lamps between the rails x = 0 and x = 6, ammeter in the common wire, voltmeter on lamp 2
{
	id = 0;
	const els = [
		e('source', [2, 5], [4, 5], 6),
		W([0, 5], [2, 5]),
		e('ammeter', [0, 5], [0, 3]), // «+» at the bottom: the current goes up
		W([0, 1], [0, 3]),
		e('lamp', [2, 1], [4, 1], 12),
		W([0, 1], [2, 1]),
		W([4, 1], [6, 1]),
		e('lamp', [2, 3], [4, 3], 12),
		W([0, 3], [2, 3]),
		W([4, 3], [6, 3]),
		W([6, 1], [6, 3]),
		W([4, 5], [6, 5]),
		e('voltmeter', [2, 4], [4, 4]),
		W([2, 3], [2, 4]),
		W([4, 3], [4, 4]),
		e('ammeter', [6, 3], [6, 5]), // in the right rail below lamp 2's branch: the total current, going down
	];
	add('parallel, two lamps 12 Ом on 6 В', els, { 'I:3': 1, 'I:16': 1, 'V:13': 6, 'P:5': 3, 'P:8': 3 });
}
// 3. mixed: lamp 12 Ом, then lamp 12 Ом ∥ resistor 6 Ом
{
	id = 0;
	const els = [
		e('source', [2, 5], [4, 5], 6),
		W([0, 5], [2, 5]),
		W([0, 1], [0, 5]),
		e('lamp', [0, 1], [2, 1], 12),
		W([2, 1], [3, 1]),
		W([3, 0], [3, 2]), // the T-junction at (3,1) splits it
		e('lamp', [3, 0], [5, 0], 12),
		e('resistor', [3, 2], [5, 2], 6),
		W([5, 0], [5, 2]),
		W([5, 1], [6, 1]),
		W([6, 1], [6, 5]),
		W([4, 5], [6, 5]),
	];
	add('mixed, 12 + (12 ∥ 6) on 6 В', els, { 'I:4': 0.375, 'I:7': 0.125, 'I:8': 0.25 });
}
// 4–5. bridges: R1 A–C, R2 C–B, R3 A–D, R4 D–B, R5 C–D
const bridge = (r4: number) => {
	id = 0;
	return [
		e('source', [2, 6], [4, 6], 6),
		W([0, 6], [2, 6]),
		W([4, 6], [6, 6]),
		W([0, 0], [0, 6]),
		W([6, 0], [6, 6]),
		e('resistor', [0, 0], [2, 0], 10),
		W([2, 0], [4, 0]),
		e('resistor', [4, 0], [6, 0], 20),
		e('resistor', [0, 4], [2, 4], 10),
		W([2, 4], [4, 4]),
		e('resistor', [4, 4], [6, 4], r4),
		W([3, 0], [3, 1]),
		e('ammeter', [3, 1], [3, 3], 0),
		e('resistor', [3, 3], [3, 4], 5), // 1 cell long is fine for the solver
	];
};
add('balanced bridge', bridge(20), { 'I:13': 0, 'I:6': 0.2, 'I:9': 0.2 });
// unbalanced: by hand (nodal): see check_circuit_solver.py for the independent value
add('unbalanced bridge (R4 = 30 Ом)', bridge(30), {});
// 6. two sources aiding / opposing in series with a lamp 12 Ом
const twoSources = (opp: boolean) => {
	id = 0;
	return [
		e('source', [0, 4], [2, 4], 4.5),
		opp ? e('source', [4, 4], [2, 4], 1.5) : e('source', [2, 4], [4, 4], 1.5),
		W([4, 4], [6, 4]),
		W([6, 0], [6, 4]),
		e('lamp', [4, 0], [6, 0], 12),
		e('ammeter', [2, 0], [4, 0]),
		W([0, 0], [2, 0]),
		W([0, 0], [0, 4]),
	];
};
// aiding: «+» of the first (0,4) … current leaves at (0,4) → up → right → lamp → down → into «−» of source 2 at (4,4)
add('two sources aiding (4,5 + 1,5 В)', twoSources(false), { 'I:6': 0.5 });
add('two sources opposing (4,5 − 1,5 В)', twoSources(true), { 'I:6': 0.25 });
// 7. voltmeter in series with a lamp and an ammeter
{
	id = 0;
	const els = [
		e('source', [2, 4], [4, 4], 6),
		W([0, 4], [2, 4]),
		W([0, 0], [0, 4]),
		e('voltmeter', [0, 0], [2, 0]),
		e('lamp', [2, 0], [4, 0], 12),
		e('ammeter', [4, 0], [6, 0]),
		W([6, 0], [6, 4]),
		W([4, 4], [6, 4]),
	];
	add('voltmeter in series', els, { 'V:4': 6, 'I:6': 0 });
}
// 8. ammeter across a lamp (a resistor 12 Ом limits the current)
{
	id = 0;
	const els = [
		e('source', [2, 4], [4, 4], 6),
		W([0, 4], [2, 4]),
		W([0, 0], [0, 4]),
		e('resistor', [0, 0], [2, 0], 12),
		e('lamp', [2, 0], [4, 0], 12),
		W([4, 0], [6, 0]),
		W([6, 0], [6, 4]),
		W([4, 4], [6, 4]),
		W([2, 0], [2, 1]),
		W([4, 0], [4, 1]),
		e('ammeter', [2, 1], [4, 1]),
	];
	add('ammeter across a lamp', els, { 'I:11': 0.5, 'P:5': 0 });
}
// 9. short circuit: a wire across the lamp, a fuse 1 А in the loop; then the same with the fuse blown
const shortCase = (blown: boolean) => {
	id = 0;
	return [
		e('source', [1, 3], [1, 5], 4.5),
		W([1, 2], [1, 3]),
		W([1, 5], [1, 6]),
		W([1, 2], [2, 2]),
		e('fuse', [2, 2], [4, 2], 1, { broken: blown }),
		W([4, 2], [6, 2]),
		e('lamp', [6, 2], [6, 4], 12),
		W([6, 4], [6, 6]),
		W([1, 6], [6, 6]),
		W([5, 2], [5, 6]), // the short: both ends on the interior of the rails
	];
};
add('short circuit through a fuse', shortCase(false), { 'I:5': 450000, 'P:7': 0 }, true);
add('short circuit, fuse blown', shortCase(true), { 'I:5': 0, 'P:7': 0 });
// 10. short circuit without a fuse, an ammeter in the loop, another lamp on the source
{
	id = 0;
	const els = [
		e('source', [2, 4], [4, 4], 6),
		W([0, 4], [2, 4]),
		W([0, 0], [0, 4]),
		e('lamp', [0, 0], [2, 0], 12),
		W([2, 0], [6, 0]),
		W([6, 0], [6, 4]),
		W([4, 4], [6, 4]),
		e('ammeter', [2, 4], [2, 2]), // straight from «+» to «−» through the ammeter and wires
		W([2, 2], [4, 2]),
		W([4, 2], [4, 4]),
	];
	add('short circuit by an ammeter', els, { 'I:8': 600000, 'P:4': 0 }, true);
}
// 11. floating parts: a lamp and a voltmeter that touch nothing powered
{
	id = 0;
	const els = [e('lamp', [0, 0], [2, 0], 12), e('voltmeter', [0, 2], [2, 2]), W([0, 0], [0, 2]), W([2, 0], [2, 2]), e('source', [4, 0], [6, 0], 6)];
	add('floating lamp and voltmeter', els, { 'V:2': 0, 'P:1': 0, 'I:5': 0 });
}
// 12. open key: no current; a voltmeter across the open key shows the source voltage
{
	id = 0;
	const els = [
		e('source', [2, 4], [4, 4], 6),
		W([0, 4], [2, 4]),
		W([0, 0], [0, 4]),
		e('key', [0, 0], [2, 0], 0, { closed: false }),
		e('lamp', [2, 0], [4, 0], 12),
		e('ammeter', [4, 0], [6, 0]),
		W([6, 0], [6, 4]),
		W([4, 4], [6, 4]),
		W([0, 0], [0, -1]),
		W([2, 0], [2, -1]),
		e('voltmeter', [0, -1], [2, -1]),
	];
	add('open key', els, { 'I:6': 0, 'V:11': 6, 'P:5': 0 });
	const closed = els.map((x) => (x.kind === 'key' ? { ...x, closed: true } : x));
	add('closed key', closed, { 'I:6': 0.5, 'V:11': 0, 'P:5': 3 });
}
// 13. crossing wires do not connect: a wire crossing the loop does not short the lamp
{
	id = 0;
	const els = [
		e('source', [2, 4], [4, 4], 6),
		W([0, 4], [2, 4]),
		W([0, 0], [0, 4]),
		e('lamp', [0, 0], [2, 0], 12),
		W([2, 0], [6, 0]),
		W([6, 0], [6, 4]),
		W([4, 4], [6, 4]),
		W([-1, 2], [7, 2]), // crosses both rails
		e('ammeter', [2, 0], [2, -2]),
		W([2, -2], [4, -2]),
		W([4, -2], [4, 0]), // the ammeter's loop is in parallel with the wire (2,0)–(4,0): an ideal loop
	];
	add('crossing wires, ideal loop', els, { 'P:4': 3 });
}
// 14. two sources in parallel, aiding (equal) and opposing (a short)
{
	id = 0;
	const els = [
		e('source', [2, 4], [4, 4], 4.5),
		e('source', [2, 2], [4, 2], 4.5),
		W([0, 4], [2, 4]),
		W([0, 0], [0, 4]),
		W([0, 2], [2, 2]),
		W([4, 2], [6, 2]),
		e('lamp', [0, 0], [2, 0], 12),
		W([2, 0], [6, 0]),
		W([6, 0], [6, 4]),
		W([4, 4], [6, 4]),
	];
	add('two equal sources in parallel', els, { 'I:1': -0.1875, 'I:2': -0.1875, 'P:7': 4.5 ** 2 / 12 });
	const opp = els.map((x) => (x.id === 2 ? { ...x, a: [4, 2] as P, b: [2, 2] as P } : x));
	add('two sources in parallel, opposing', opp, {}, true);
}

let fails = 0;
const dump: object[] = [];
for (const c of cases) {
	const { out, s } = read(c.els);
	const bad: string[] = [];
	for (const [k, v] of Object.entries(c.expect)) {
		const got = out[k];
		const tol = Math.abs(v) > 100 ? 0.01 * Math.abs(v) : 1e-3;
		if (got === undefined || Math.abs(got - v) > tol) bad.push(`${k}: expected ${v}, got ${got}`);
	}
	if (Boolean(c.short) !== s.shorted.length > 0) bad.push(`short: expected ${Boolean(c.short)}, got ${s.shorted.join(',')}`);
	// Kirchhoff's current law at every node, ideal and real branches together
	const kcl = new Map<string, number>();
	const flow = (a: P, b: P, i: number) => {
		kcl.set(`${a}`, (kcl.get(`${a}`) ?? 0) - i);
		kcl.set(`${b}`, (kcl.get(`${b}`) ?? 0) + i);
	};
	for (const p of s.pieces) flow(p.a, p.b, p.I);
	for (const el of c.els) if (el.kind !== 'wire') flow(el.a, el.b, s.I.get(el.id) ?? 0);
	const worst = Math.max(0, ...[...kcl.values()].map(Math.abs));
	if (worst > 1e-6 * Math.max(1, ...[...s.I.values()].map(Math.abs))) bad.push(`KCL broken by ${worst}`);
	console.log(`${bad.length ? 'FAIL' : 'ok  '} ${c.name}${bad.length ? '\n     ' + bad.join('\n     ') : ''}`);
	fails += bad.length ? 1 : 0;
	dump.push({ name: c.name, els: c.els, got: out, shorted: s.shorted });
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(dump, null, 1));
console.log(fails ? `${fails} case(s) failed` : `all ${cases.length} cases passed`);
process.exit(fails ? 1 : 0);
