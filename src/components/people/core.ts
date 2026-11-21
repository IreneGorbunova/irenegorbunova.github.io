/**
 * The people kit, core: points, SVG elements, the skeleton of a person and the two-bone inverse kinematics.
 *
 * Coordinates are SVG user units (px), y pointing down. A person is built facing +x ("right"); a person facing left is
 * the same drawing mirrored by its group, so every rule below is stated for a person facing right, seen from their
 * right side (the near side). The near arm and leg are the right ones, the far arm and leg the left ones.
 *
 * Proportions in parts of the height H (SKELETON below; adult as in the old helpers of «Давление. Закон Паскаля»):
 *   adult (about 7½ heads): hip joint 0,52 H, thigh 0,24 H, shin 0,235 H, ankle 0,045 H above the sole, shoulder joint
 *     0,27 H above the hip joint along the spine, head center 0,40 H above it, head radius 0,064 H, upper arm 0,18 H,
 *     forearm (elbow to wrist) 0,135 H, hand (wrist to the tip of the middle finger) 0,105 H;
 *   teen (about 7 heads): hip 0,505 H, thigh 0,232 H, shin 0,228 H, shoulder 0,285 H, head center 0,424 H, head radius
 *     0,071 H, upper arm 0,176 H, forearm 0,133 H, hand 0,104 H;
 *   child of about 7 (about 6 heads): hip 0,48 H, thigh 0,218 H, shin 0,217 H, shoulder 0,28 H, head center 0,437 H,
 *     head radius 0,083 H, upper arm 0,17 H, forearm 0,125 H, hand 0,10 H.
 *
 * Joint limits (the rules, «People»): the elbow bends 0–150° and only forward (the forearm turns toward the front of
 * the upper arm), the knee 0–150° and only backward, the wrist about ±70° in its bending plane and ±30° sideways, the
 * head turns by at most ±40°. In the 2D picture the elbow of a right-facing person always lies behind the line
 * shoulder → wrist (`ELBOW` = −1 for `ik`), the knee in front of the line hip → ankle (`KNEE` = +1).
 */

export type Pt = { x: number; y: number };
export type Age = 'adult' | 'teen' | 'child';

export const NS = 'http://www.w3.org/2000/svg';
export const DEG = Math.PI / 180;

/** A new SVG element with attributes. */
export const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
	const e = document.createElementNS(NS, tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	return e;
};
/** Appends a new SVG element to `parent`. */
export const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
	const e = el(tag, attrs);
	parent.append(e);
	return e;
};
export const f1 = (v: number) => v.toFixed(1);
export const f2 = (v: number) => v.toFixed(2);
export const P1 = (p: Pt) => `${f1(p.x)} ${f1(p.y)}`;
export const P2 = (p: Pt) => `${f2(p.x)} ${f2(p.y)}`;

export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const len = (a: Pt) => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const polar = (r: number, a: number): Pt => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
export const angleOf = (v: Pt) => Math.atan2(v.y, v.x);
/** An angle brought to (−π, π]. */
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Bone lengths and body landmarks in parts of the height. */
export interface Skeleton {
	hip: number; // hip joint above the sole
	thigh: number;
	shin: number;
	ankle: number; // ankle above the sole (bare foot)
	shoulder: number; // shoulder joint above the hip joint, along the spine
	headC: number; // head center above the hip joint, along the spine
	headR: number;
	upper: number; // upper arm
	fore: number; // forearm, elbow to wrist
	hand: number; // wrist to the tip of the middle finger
	depth: number; // depth of the body (front to back) at girth 1
}
export const SKELETON: Record<Age, Skeleton> = {
	adult: { hip: 0.52, thigh: 0.24, shin: 0.235, ankle: 0.045, shoulder: 0.27, headC: 0.4, headR: 0.064, upper: 0.18, fore: 0.135, hand: 0.105, depth: 0.15 },
	teen: { hip: 0.505, thigh: 0.232, shin: 0.228, ankle: 0.045, shoulder: 0.285, headC: 0.424, headR: 0.071, upper: 0.176, fore: 0.133, hand: 0.104, depth: 0.14 },
	child: { hip: 0.48, thigh: 0.218, shin: 0.217, ankle: 0.045, shoulder: 0.28, headC: 0.437, headR: 0.083, upper: 0.17, fore: 0.125, hand: 0.1, depth: 0.14 },
};

/** Joint limits, radians. */
export const LIMITS = {
	elbow: [0, 150 * DEG] as const,
	knee: [0, 150 * DEG] as const,
	wristBend: 70 * DEG, // flexion / extension, in the plane of the palm normal
	wristSide: 30 * DEG, // radial / ulnar deviation
	head: 40 * DEG,
	// fingers: [MCP, PIP, DIP]; the thumb's joints are placed by targets and kept on their bone lengths
	finger: [90 * DEG, 110 * DEG, 80 * DEG] as const,
};
export const ELBOW = -1 as const;
export const KNEE = 1 as const;

/**
 * Two-bone inverse kinematics: the middle joint between `a` and the target `b` for bones l1, l2. `side` 1 puts the
 * joint to the right of a → b turned clockwise on screen (a knee of a right-facing person: forward), −1 to the other
 * side (an elbow: backward). The bones never change length: a target out of reach is approached along the line a → b,
 * and a target too close (the joint would bend over `maxBend`) is pushed out to the closest allowed distance.
 * Returns the joint, the end actually reached and the bend angle (0 = straight).
 */
export const ik = (a: Pt, b: Pt, l1: number, l2: number, side: 1 | -1, maxBend = 150 * DEG): { j: Pt; end: Pt; bend: number } => {
	let dx = b.x - a.x;
	let dy = b.y - a.y;
	const d0 = Math.hypot(dx, dy);
	if (d0 < 1e-6) {
		dx = 0;
		dy = 1;
	} else {
		dx /= d0;
		dy /= d0;
	}
	const dMax = (l1 + l2) * 0.9995;
	const dMin = Math.sqrt(Math.max(0, l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(Math.PI - maxBend)));
	const d = clamp(d0, Math.max(dMin, Math.abs(l1 - l2) + 1e-3), dMax);
	const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
	const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
	const j = { x: a.x + dx * along + dy * h * side, y: a.y + dy * along - dx * h * side };
	const end = { x: a.x + dx * d, y: a.y + dy * d };
	const cosB = clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
	return { j, end, bend: Math.PI - Math.acos(cosB) };
};

/** Forward kinematics of a two-bone limb: the first bone at screen angle `angle`, the joint bent by `bend` (0 = straight) to `side`. */
export const fk = (a: Pt, angle: number, bend: number, l1: number, l2: number, side: 1 | -1): { j: Pt; end: Pt } => {
	const j = add(a, polar(l1, angle));
	// side 1 (knee) turns the second bone clockwise on screen (y down: the angle grows), −1 (elbow) counterclockwise
	return { j, end: add(j, polar(l2, angle + side * bend)) };
};

/** Signed bend of a two-bone chain a → j → e, positive when it bends to `side` (as `ik` would). */
export const bendOf = (a: Pt, j: Pt, e: Pt, side: 1 | -1) => {
	const u = sub(j, a);
	const v = sub(e, j);
	const ang = wrap(angleOf(v) - angleOf(u));
	return side * ang;
};

// ---- the debug switch: ?people-debug in the URL
let dbg: boolean | null = null;
export const debugOn = () => {
	if (dbg === null) dbg = typeof location !== 'undefined' && /[?&]people-debug\b/.test(location.search);
	return dbg;
};
let serial = 0;
/** A unique id for a person on this page. */
export const nextId = (kind: string) => `${kind}-${++serial}`;
