/**
 * Geometry of FlowPicture.astro (SVG units). The battery stands on the left wire with «+» on top; the current goes
 * clockwise: up from «+», right along the top, down the right wire and back along the bottom. Every path is listed in
 * the direction of the current with its share `f` of the whole current I.
 */
export type FlowKind = 'series' | 'parallel' | 'mixed';
type Pt = [number, number];
type Dir = 'r' | 'l' | 'u' | 'd';

export interface FlowGeometry {
	W: number;
	H: number;
	RL: number;
	bat: { x: number; y1: number; y2: number };
	paths: { pts: Pt[]; f: number }[];
	/** lamps: centre, label (R_1 …) and its place, power relative to the brightest lamp */
	lamps: { x: number; y: number; label: string; lx: number; ly: number; p: number }[];
	nodes: Pt[];
	notes: { x: number; y: number; t: string }[];
	arrows: { x: number; y: number; dir: Dir; label: string; lx: number; ly: number }[];
}

const W = 520;
const XL = 60; // left wire
const XR = 470; // right wire
const T = 70; // top wire
const D = 80; // drop of the lower branch below the top wire
const B = 236; // bottom wire
const H = 250;
const RL = 17;
const bat = { x: XL, y1: 141, y2: 157 };

/** the wire from «+» up and along the top to x */
const up = (x: number): Pt[] => [
	[XL, bat.y1],
	[XL, T],
	[x, T],
];
/** the wire from x along the top, down the right side and back along the bottom to «−» */
const back = (x: number): Pt[] => [
	[x, T],
	[XR, T],
	[XR, B],
	[XL, B],
	[XL, bat.y2],
];
/** a current arrow under (or over, side < 0) a horizontal wire at height y */
const harrow = (x: number, y: number, dir: Dir, label: string, side = 1) => ({
	x,
	y: y + side * 16,
	dir,
	label,
	lx: x,
	ly: side > 0 ? y + 42 : y - 28,
});
const lamp = (x: number, y: number, label: string, p: number, above = true) => ({
	x,
	y,
	label,
	lx: x + 30,
	ly: above ? y - 16 : y + 30,
	p,
});

export const flowGeometry = (kind: FlowKind): FlowGeometry => {
	const base = { W, H, RL, bat };
	if (kind === 'series') {
		return {
			...base,
			paths: [{ pts: [...up(XR), ...back(XR).slice(1)], f: 1 }],
			lamps: [lamp(200, T, 'R_1', 1), lamp(340, T, 'R_2', 1)],
			nodes: [],
			notes: [],
			arrows: [harrow(140, T, 'r', 'I_1'), harrow(270, T, 'r', 'I_2'), harrow(410, T, 'r', 'I'), harrow(265, B, 'l', 'I', -1)],
		};
	}
	if (kind === 'parallel') {
		// R2 = 2 R1: I1 = 2/3 I, I2 = 1/3 I; power U²/R: lamp 2 has half the power of lamp 1
		const A = 160;
		const C = 380;
		return {
			...base,
			paths: [
				{ pts: up(A), f: 1 },
				{
					pts: [
						[A, T],
						[C, T],
					],
					f: 2 / 3,
				},
				{
					pts: [
						[A, T],
						[A, T + D],
						[C, T + D],
						[C, T],
					],
					f: 1 / 3,
				},
				{ pts: back(C), f: 1 },
			],
			lamps: [lamp(290, T, 'R_1', 1), lamp(290, T + D, 'R_2', 0.5, false)],
			nodes: [
				[A, T],
				[C, T],
			],
			notes: [
				{ x: A, y: T - 16, t: 'узел' },
				{ x: C, y: T - 16, t: 'узел' },
			],
			arrows: [harrow(110, T, 'r', 'I'), harrow(225, T, 'r', 'I_1', -1), harrow(225, T + D, 'r', 'I_2'), harrow(380, B, 'l', 'I', -1)],
		};
	}
	// mixed: lamp 1, then equal lamps 2 and 3 in parallel: I2 = I3 = I/2, power of lamps 2, 3 = 1/4 of lamp 1
	const A = 220;
	const C = 400;
	return {
		...base,
		paths: [
			{ pts: up(A), f: 1 },
			{
				pts: [
					[A, T],
					[C, T],
				],
				f: 0.5,
			},
			{
				pts: [
					[A, T],
					[A, T + D],
					[C, T + D],
					[C, T],
				],
				f: 0.5,
			},
			{ pts: back(C), f: 1 },
		],
		lamps: [lamp(140, T, 'R_1', 1), lamp(310, T, 'R_2', 0.25), lamp(310, T + D, 'R_3', 0.25, false)],
		nodes: [
			[A, T],
			[C, T],
		],
		notes: [
			{ x: A, y: T - 16, t: 'узел' },
			{ x: C, y: T - 16, t: 'узел' },
		],
		arrows: [harrow(95, T, 'r', 'I_1'), harrow(260, T, 'r', 'I_2', -1), harrow(260, T + D, 'r', 'I_3'), harrow(380, B, 'l', 'I', -1)],
	};
};
