/** Geometry of the main model (SVG units). The current leaves the «+» plate of the source to the left. */
import type { Mode } from './sp';

export const L = {
	W: 720,
	H: 412,
	YB: 360, // bottom wire with the source
	YM: 160, // level of the nodes of the lamp region
	XL: 50, // left vertical wire
	XR: 670, // right vertical wire
	XBP: 350, // «+» plate
	XBN: 370, // «−» plate
	XAM: 200, // ammeter
	RAM: 20,
	XVA: 290, // voltmeter branch (connected across the source)
	XVB: 430,
	YV: 298,
	XVM: 360,
	RVM: 20,
	XN1: 170, // entrance to the lamp region
	XN2: 550, // exit from the lamp region
	XS: 340, // node of the mixed circuit
	RL: 22, // lamp radius
};

export type Pt = [number, number];

/** Centres of the lamps for a circuit of n lamps. */
export const lampPos = (mode: Mode, n: number): Pt[] => {
	if (mode === 'series') return (n === 3 ? [245, 360, 475] : [290, 430]).map((x) => [x, L.YM] as Pt);
	if (mode === 'parallel') return (n === 3 ? [70, 160, 250] : [115, 205]).map((y) => [360, y] as Pt);
	return [
		[255, L.YM],
		[445, 110],
		[445, 210],
	];
};

/** A wire of the lamp region, drawn in the direction of the current; `cur` = -1 for the whole current I, else lamp index. */
export interface Edge {
	pts: Pt[];
	cur: number;
}

const branch = (x1: number, x2: number, y: number): Pt[] =>
	y === L.YM
		? [
				[x1, L.YM],
				[x2, L.YM],
			]
		: [
				[x1, L.YM],
				[x1, y],
				[x2, y],
				[x2, L.YM],
			];

export const regionEdges = (mode: Mode, n: number): Edge[] => {
	const pos = lampPos(mode, n);
	if (mode === 'series')
		return [
			{
				pts: [
					[L.XN1, L.YM],
					[L.XN2, L.YM],
				],
				cur: -1,
			},
		];
	if (mode === 'parallel') return pos.map((p, k) => ({ pts: branch(L.XN1, L.XN2, p[1]), cur: k }));
	return [
		{
			pts: [
				[L.XN1, L.YM],
				[L.XS, L.YM],
			],
			cur: -1,
		},
		{ pts: branch(L.XS, L.XN2, pos[1][1]), cur: 1 },
		{ pts: branch(L.XS, L.XN2, pos[2][1]), cur: 2 },
	];
};

/** Junctions drawn as dots. */
export const regionNodes = (mode: Mode): Pt[] =>
	mode === 'series'
		? []
		: [
				[mode === 'parallel' ? L.XN1 : L.XS, L.YM],
				[L.XN2, L.YM],
			];

export const pathD = (pts: Pt[]) => pts.map((p, k) => `${k ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');

/** A polyline with lookup of the point at a given distance from its start. */
export const polyline = (pts: Pt[]) => {
	const lens = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
	const total = lens.reduce((a, b) => a + b, 0);
	const at = (s: number): Pt => {
		let rest = ((s % total) + total) % total;
		for (let k = 0; k < lens.length; k++) {
			if (rest <= lens[k] || k === lens.length - 1) {
				const t = lens[k] ? Math.min(rest / lens[k], 1) : 0;
				return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t];
			}
			rest -= lens[k];
		}
		return pts[0];
	};
	return { total, at };
};
