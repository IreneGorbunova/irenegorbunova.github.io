/**
 * The people kit, hands: a palm, a thumb and four fingers of three segments each, modelled in 3D and projected onto the
 * picture, so that one hand can be seen from the back, from the palm or from its edge, at any size.
 *
 * Local frame of a hand, in parts of its length Lh (wrist to the tip of the middle finger): x from the wrist along the
 * middle finger, y out of the back of the hand (the palm faces −y), z toward the thumb. The fingers bend only toward the
 * palm (about the axis y × finger), joint by joint, within the limits MCP 0–90°, PIP 0–110°, DIP 0–80°.
 *   knuckles (MCP) at x 0,46 / 0,48 / 0,46 / 0,42 (index … little finger), z 0,15 / 0,05 / −0,05 / −0,14;
 *   phalanges: index 0,21 + 0,13 + 0,10, middle 0,23 + 0,15 + 0,11, ring 0,22 + 0,14 + 0,10, little 0,17 + 0,11 + 0,09;
 *   finger radii 0,047 / 0,049 / 0,045 / 0,039; palm 0,11 thick, about 0,39 wide at the knuckles;
 *   thumb: base (CMC) at (0,08, −0,03, 0,11), metacarpal 0,24, proximal phalanx 0,17, distal 0,13.
 *
 * Placement on the picture (a HandFrame): the wrist point, `dir` = the screen angle of the hand's x axis, and `roll` =
 * which way the palm faces: the palm normal is cos(roll)·n + sin(roll)·v, where n is the hand's direction turned 90°
 * clockwise on screen and v points to the viewer. roll 0: the palm faces the clockwise side (a hand reaching right with
 * the palm down), π/2: the palm faces the viewer, −π/2: the back of the hand faces the viewer. A left hand and a right
 * hand are mirror images (in the left-handed screen frame x right, y down, z to the viewer the thumb is on y × x for
 * the left hand and on x × y for the right one); a person facing right shows the viewer their right side, so the near
 * hand is the right one.
 *
 * Levels of detail: a skin or glove hand shorter than DETAIL px (about 8 px across the hand) and every mitten is drawn
 * as a mitten shape (palm and four fingers in one piece that bends with them) with a separate thumb.
 *
 * Poses (`handShape`): relaxed, fist, grip (around a cylinder of a given diameter across the palm, along local z),
 * pinch (thumb pad to index pad: a pencil, a card), point, flat (press), open (wave), tap (index slightly bent, the
 * others curled). Shapes are numbers (finger angles, thumb joint points), so two shapes blend (`blendShape`).
 */
import { DEG, clamp, f2, mk, type Pt } from './core';

export type V3 = [number, number, number];
export type Side = 'L' | 'R';
export type HandPose = 'relaxed' | 'fist' | 'grip' | 'pinch' | 'point' | 'flat' | 'open' | 'tap';
export type Covering = 'skin' | 'mitten' | 'glove';

/** Finger flexions [MCP, PIP, DIP] (rad) for the index … little finger, their spread (rad, + toward the thumb), the thumb's MCP, IP and tip points. */
export interface HandShape {
	f: number[][];
	s: number[];
	th: V3[];
}
export interface HandFrame {
	wrist: Pt;
	dir: number;
	roll: number;
}

/** Hands shorter than this (px, wrist to fingertip) are drawn as a mitten with a thumb. */
export const DETAIL = 18;

// roll presets
export const ROLL = { palmCw: 0, palmViewer: Math.PI / 2, backViewer: -Math.PI / 2, palmCcw: Math.PI };

const MCP: V3[] = [
	[0.46, 0, 0.15],
	[0.48, 0, 0.05],
	[0.46, 0, -0.05],
	[0.42, 0, -0.14],
];
const BONES = [
	[0.21, 0.13, 0.1],
	[0.23, 0.15, 0.11],
	[0.22, 0.14, 0.1],
	[0.17, 0.11, 0.09],
];
const FR = [0.052, 0.054, 0.05, 0.043];
const TB: V3 = [0.08, -0.03, 0.11];
const TL = [0.24, 0.17, 0.13];
const TR = [0.085, 0.058, 0.052, 0.047];
const HALF_T = 0.055;

// ---- small 3D vector algebra
const vadd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vmul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlen = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const vnorm = (a: V3): V3 => vmul(a, 1 / (vlen(a) || 1));
const vcross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** The points of finger i (MCP, PIP, DIP, tip) for a shape. */
export const fingerPts = (i: number, sh: HandShape): V3[] => {
	const s = sh.s[i];
	const d0: V3 = [Math.cos(s), 0, Math.sin(s)];
	let p = MCP[i];
	const pts = [p];
	let phi = 0;
	for (let k = 0; k < 3; k++) {
		phi += sh.f[i][k];
		const dir: V3 = [d0[0] * Math.cos(phi), -Math.sin(phi), d0[2] * Math.cos(phi)];
		p = vadd(p, vmul(dir, BONES[i][k]));
		pts.push(p);
	}
	return pts;
};

/** Thumb from three directions (metacarpal, proximal, distal). */
const thumbDirs = (m: V3, p: V3, d: V3): V3[] => {
	const j1 = vadd(TB, vmul(vnorm(m), TL[0]));
	const j2 = vadd(j1, vmul(vnorm(p), TL[1]));
	return [j1, j2, vadd(j2, vmul(vnorm(d), TL[2]))];
};
/** Thumb from the metacarpal direction and a tip target; the IP joint bulges toward `hint`. */
const thumbTo = (m: V3, target: V3, hint: V3): V3[] => {
	const j1 = vadd(TB, vmul(vnorm(m), TL[0]));
	const [l1, l2] = [TL[1], TL[2]];
	const dv = vsub(target, j1);
	const d0 = vlen(dv) || 1e-6;
	const u = vmul(dv, 1 / d0);
	const d = clamp(d0, Math.abs(l1 - l2) + 0.01, (l1 + l2) * 0.999);
	const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
	const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
	let w = vsub(hint, vmul(u, vdot(hint, u)));
	if (vlen(w) < 1e-6) w = [0, 1, 0];
	w = vnorm(w);
	const j2 = vadd(vadd(j1, vmul(u, along)), vmul(w, h));
	return [j1, j2, vadd(j1, vmul(u, d))];
};
/** Brings a thumb back onto its bone lengths (after blending). */
const fixThumb = (th: V3[]): V3[] => {
	const j1 = vadd(TB, vmul(vnorm(vsub(th[0], TB)), TL[0]));
	const j2 = vadd(j1, vmul(vnorm(vsub(th[1], th[0])), TL[1]));
	return [j1, j2, vadd(j2, vmul(vnorm(vsub(th[2], th[1])), TL[2]))];
};

const R = (rows: number[][]) => rows.map((r) => r.map((x) => x * DEG));
const SPREAD = (a: number[]) => a.map((x) => x * DEG);
const limitF = (f: number[][]) => f.map((r) => r.map((x, k) => clamp(x, 0, [90, 110, 80][k] * DEG)));

/** Grip center (cylinder axis) in the hand frame for diameter d (in parts of Lh). */
const gripCenter = (d: number): V3 => [0.45, -(HALF_T + d / 2), 0];

/** The shape of a hand pose; `d` is the diameter of what is gripped, in parts of the hand length. */
export const handShape = (pose: HandPose, d = 0.25): HandShape => {
	const mid = (a: V3, b: V3) => vlerp(a, b, 0.5);
	const out = (p: V3, c: V3, k: number) => vadd(p, vmul(vnorm(vsub(p, c)), k));
	switch (pose) {
		case 'flat':
			return { f: R([[0, 2, 1], [0, 2, 1], [0, 2, 1], [0, 2, 1]]), s: SPREAD([2, 0, -2, -4]), th: thumbDirs([0.9, -0.12, 0.42], [0.97, -0.05, 0.22], [0.98, 0, 0.14]) };
		case 'open':
			return { f: R([[0, 3, 2], [0, 3, 2], [0, 3, 2], [0, 4, 2]]), s: SPREAD([12, 2, -8, -18]), th: thumbDirs([0.6, 0, 0.8], [0.7, 0.05, 0.7], [0.8, 0.1, 0.6]) };
		case 'relaxed':
			return { f: R([[15, 25, 12], [20, 30, 15], [25, 35, 18], [30, 40, 20]]), s: SPREAD([3, 0, -3, -7]), th: thumbDirs([0.75, -0.4, 0.5], [0.85, -0.38, 0.3], [0.8, -0.55, 0.15]) };
		case 'grip': {
			const r0 = Math.max(0.02, d / 2);
			const c = gripCenter(2 * r0);
			const f = MCP.map((m, i) => {
				const rr = r0 + FR[i];
				const ch = BONES[i].map((l) => 2 * Math.asin(Math.min(1, l / (2 * rr))));
				return [ch[0] / 2, (ch[0] + ch[1]) / 2, (ch[1] + ch[2]) / 2];
			});
			const tip: V3 = [c[0] + (r0 + 0.05) * Math.cos(235 * DEG), c[1] + (r0 + 0.05) * Math.sin(235 * DEG), 0.07];
			const sh: HandShape = { f: limitF(f), s: SPREAD([1, 0, -1, -2]), th: [] };
			const m: V3 = [0.55, -0.55, 0.6];
			const j1 = vadd(TB, vmul(vnorm(m), TL[0]));
			sh.th = thumbTo(m, tip, vsub(mid(j1, tip), c));
			return sh;
		}
		case 'pinch': {
			const sh: HandShape = { f: R([[55, 45, 15], [50, 55, 25], [60, 65, 35], [65, 75, 40]]), s: SPREAD([2, 0, -3, -6]), th: [] };
			const it = fingerPts(0, sh)[3];
			sh.th = thumbTo([0.733, -0.628, 0.262], vadd(it, [-0.035, 0.0, -0.03]), [0, 1, 0.6]);
			return sh;
		}
		case 'fist':
		case 'point':
		case 'tap': {
			const fist = [88, 100, 65];
			const rows = pose === 'tap' ? [[30, 25, 10], [70, 85, 50], [75, 90, 50], [78, 95, 50]] : [pose === 'point' ? [4, 4, 2] : fist, fist, [86, 100, 62], [84, 100, 60]];
			const sh: HandShape = { f: R(rows), s: SPREAD([2, 0, -2, -4]), th: [] };
			const a = fingerPts(pose === 'fist' ? 0 : 1, sh);
			const b = fingerPts(pose === 'fist' ? 1 : 2, sh);
			const at = mid(mid(a[1], a[2]), mid(b[1], b[2]));
			const fc: V3 = [0.4, -0.12, 0.0];
			sh.th = thumbTo([0.6, -0.5, 0.6], out(at, fc, 0.08), [0, 1, 0.8]);
			return sh;
		}
	}
};

/** A blend of two shapes, t from 0 (a) to 1 (b); the thumb stays on its bone lengths. */
export const blendShape = (a: HandShape, b: HandShape, t: number): HandShape => ({
	f: a.f.map((r, i) => r.map((x, k) => x + (b.f[i][k] - x) * t)),
	s: a.s.map((x, i) => x + (b.s[i] - x) * t),
	th: fixThumb(a.th.map((p, i) => vlerp(p, b.th[i], t))),
});

/** The point of a pose that touches or holds the object, in the hand frame (parts of Lh). */
export const contactLocal = (pose: HandPose, sh: HandShape, d = 0.25): V3 => {
	switch (pose) {
		case 'grip':
			return gripCenter(Math.max(0.04, d));
		case 'fist':
			return [0.38, -0.13, 0];
		case 'flat':
		case 'open':
			return [0.42, -HALF_T, 0];
		case 'pinch':
			return vlerp(fingerPts(0, sh)[3], sh.th[2], 0.5);
		case 'point':
		case 'tap': {
			const p = fingerPts(0, sh);
			const u = vnorm(vsub(p[3], p[2]));
			return vadd(p[3], vmul(u, FR[0] * 0.85));
		}
		default:
			return [0.45, -0.03, 0];
	}
};

/** The 3D basis of a hand on the picture: a (fingers), b (back of the hand), t (thumb side); z of each points to the viewer. */
export const handBasis = (side: Side, dir: number, roll: number) => {
	const a: V3 = [Math.cos(dir), Math.sin(dir), 0];
	const n: V3 = [-Math.sin(dir), Math.cos(dir), 0];
	const palm: V3 = vadd(vmul(n, Math.cos(roll)), [0, 0, Math.sin(roll)]);
	const b = vmul(palm, -1);
	// x right, y down, z to the viewer is a left-handed frame: the cross products are taken the other way round
	const t = side === 'L' ? vcross(b, a) : vcross(a, b);
	return { a, b, t };
};
type Basis = ReturnType<typeof handBasis>;
/** Screen point and depth (toward the viewer) of a local point; `Lh` in px. */
const proj = (w: Pt, B: Basis, Lh: number, p: V3) => ({
	x: w.x + Lh * (p[0] * B.a[0] + p[1] * B.b[0] + p[2] * B.t[0]),
	y: w.y + Lh * (p[0] * B.a[1] + p[1] * B.b[1] + p[2] * B.t[1]),
	z: Lh * (p[1] * B.b[2] + p[2] * B.t[2]),
});
/** Where a local point of a placed hand lands on the picture. */
export const handPoint = (side: Side, fr: HandFrame, Lh: number, p: V3): Pt => {
	const q = proj(fr.wrist, handBasis(side, fr.dir, fr.roll), Lh, p);
	return { x: q.x, y: q.y };
};
/** The wrist that puts the local point `p` of a hand with this direction and roll at `target`. */
export const wristFor = (side: Side, target: Pt, dir: number, roll: number, Lh: number, p: V3): Pt => {
	const q = proj({ x: 0, y: 0 }, handBasis(side, dir, roll), Lh, p);
	return { x: target.x - q.x, y: target.y - q.y };
};

// ---- drawing
const hull = (pts: Pt[]): Pt[] => {
	const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
	if (p.length < 3) return p;
	const cr = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const lo: Pt[] = [];
	for (const q of p) {
		while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
		lo.push(q);
	}
	const up: Pt[] = [];
	for (const q of [...p].reverse()) {
		while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
		up.push(q);
	}
	return lo.slice(0, -1).concat(up.slice(0, -1));
};
/** A closed outline with its corners rounded (quadratic curves through the edge midpoints). */
const smooth = (h: Pt[]) => {
	if (h.length < 3) return '';
	const m = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
	let d = `M${f2(m(h[h.length - 1], h[0]).x)} ${f2(m(h[h.length - 1], h[0]).y)}`;
	for (let i = 0; i < h.length; i++) {
		const n = m(h[i], h[(i + 1) % h.length]);
		d += ` Q${f2(h[i].x)} ${f2(h[i].y)} ${f2(n.x)} ${f2(n.y)}`;
	}
	return d + ' Z';
};
/** A capsule: two circles (radii ra, rb) joined by their tangents. */
const capsule = (a: Pt, b: Pt, ra: number, rb: number) => {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const l = Math.hypot(dx, dy);
	if (l < Math.abs(ra - rb) + 0.05) {
		const c = ra > rb ? a : b;
		const r = Math.max(ra, rb);
		return `M${f2(c.x - r)} ${f2(c.y)} a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0 a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0 Z`;
	}
	const ux = dx / l;
	const uy = dy / l;
	const nx = -uy;
	const ny = ux;
	const p = (c: Pt, r: number, k: number) => `${f2(c.x + nx * r * k)} ${f2(c.y + ny * r * k)}`;
	return `M${p(a, ra, 1)} L${p(b, rb, 1)} A${f2(rb)} ${f2(rb)} 0 0 0 ${p(b, rb, -1)} L${p(a, ra, -1)} A${f2(ra)} ${f2(ra)} 0 0 0 ${p(a, ra, 1)} Z`;
};
/** The rounded convex outline of a chain of circles (a mitten). */
const blob = (q: Pt[], r: number[]) => {
	const pts: Pt[] = [];
	q.forEach((c, k) => {
		for (let i = 0; i < 16; i++) pts.push({ x: c.x + r[k] * Math.cos((i * Math.PI) / 8), y: c.y + r[k] * Math.sin((i * Math.PI) / 8) });
	});
	return smooth(hull(pts));
};

export interface HandOpts {
	cls: string; // fill class of the skin, the mitten or the glove (it gives the outline too)
	side: Side;
	Lh: number; // px, wrist to the tip of the middle finger
	covering?: Covering;
}
export interface HandDebug {
	side: Side;
	pose: string;
	dir: number;
	roll: number;
	mode: 'fingers' | 'mitten';
	flex: number[][];
	spread: number[];
	thumb: number[]; // the thumb's bone lengths, parts of Lh
	contact: Pt | null;
	bbox?: { x: number; y: number; w: number; h: number };
}

/**
 * A hand drawn into `parent`; `set` places and shapes it. With a back layer (`setBack`), the parts of the fingers and
 * the thumb that lie farther from the viewer than the contact point go into that layer, which the caller puts behind
 * the held object: a rope, a pole or a glass then passes between the fingers.
 */
export const hand = (parent: Element, o: HandOpts) => {
	const g = mk(parent, 'g', { class: 'pk-hand', 'data-hand': o.side });
	const covering = o.covering ?? 'skin';
	const mitten = covering === 'mitten' || o.Lh < DETAIL;
	const sw = clamp(o.Lh * 0.03, 0.3, 0.8);
	const st = `stroke-width:${sw.toFixed(2)};stroke-linejoin:round`;
	const part = (host: Element = g) => mk(host, 'path', { class: o.cls, style: st });
	const palm = part();
	// fingers and thumb as capsules, one per segment: 4 × 3 + 3
	// a finger or the thumb is drawn as runs of capsules (a run ends at a joint bent over 35°); a run is an outline
	// copy with a double stroke under a fill copy without a stroke, so a straight finger shows no creases at its joints
	type Run = { g: SVGGElement; o: SVGPathElement; f: SVGPathElement };
	const run = (host: Element): Run => {
		const rg = mk(host, 'g', {});
		return { g: rg, o: mk(rg, 'path', { class: o.cls, style: `stroke-width:${(2 * sw).toFixed(2)};stroke-linejoin:round` }), f: mk(rg, 'path', { class: o.cls, style: 'stroke:none' }) };
	};
	const nChains = mitten ? 1 : 5;
	const segs = Array.from({ length: nChains * 3 }, () => run(g));
	let backG: SVGGElement | null = null;
	let backSegs: Run[] = [];
	const setBack = (host: Element | null) => {
		backG?.remove();
		backG = host ? mk(host, 'g', { class: 'pk-hand-back', 'data-hand': o.side }) : null;
		backSegs = backG ? segs.map(() => run(backG!)) : [];
		if (backG) backPalm = part(backG);
	};
	let backPalm: SVGPathElement | null = null;
	const debug: HandDebug = { side: o.side, pose: '', dir: 0, roll: 0, mode: mitten ? 'mitten' : 'fingers', flex: [], spread: [], thumb: [], contact: null };
	type Q = { x: number; y: number; z: number };

	const set = (fr: HandFrame, sh: HandShape, pose = '', contact?: V3) => {
		const B = handBasis(o.side, fr.dir, fr.roll);
		const pr = (p: V3) => proj(fr.wrist, B, o.Lh, p);
		const zc = backG && contact ? pr(contact).z : null;
		const items: { z: number; k: number; e: Element }[] = [];
		let si = 0;
		// a segment: in front, or (behind the held object) in the back layer
		// a chain of points with radii and the bends at its inner joints
		const chain = (q: Q[], r: number[], bends: number[]) => {
			const runs: number[][] = [[0]];
			for (let k = 1; k < q.length - 1; k++) {
				if (bends[k - 1] > 35 * DEG) runs.push([k]);
				else runs[runs.length - 1].push(k);
			}
			for (let k = 0; k < 3; k++) {
				const slot = segs[si];
				const bslot = backSegs[si];
				si++;
				const ks = runs[k];
				if (!ks) {
					slot.o.setAttribute('d', '');
					slot.f.setAttribute('d', '');
					if (bslot) bslot.o.setAttribute('d', ''), bslot.f.setAttribute('d', '');
					continue;
				}
				const d = ks.map((i) => capsule(q[i], q[i + 1], r[i], r[i + 1])).join(' ');
				const z = ks.reduce((acc, i) => acc + (q[i].z + q[i + 1].z) / 2, 0) / ks.length;
				const back = zc !== null && z < zc;
				slot.o.setAttribute('d', back ? '' : d);
				slot.f.setAttribute('d', back ? '' : d);
				if (bslot) bslot.o.setAttribute('d', back ? d : ''), bslot.f.setAttribute('d', back ? d : '');
				items.push({ z, k, e: slot.g });
			}
		};
		const ang3 = (a: V3, b: V3, c: V3) => {
			const u = vnorm(vsub(b, a));
			const v = vnorm(vsub(c, b));
			return Math.acos(clamp(vdot(u, v), -1, 1));
		};
		// the thumb: metacarpal (the fleshy base), proximal and distal phalanges
		const tp = [TB, ...sh.th].map(pr);
		const t3 = [TB, ...sh.th];
		chain(tp, TR.map((x) => x * o.Lh), [ang3(t3[0], t3[1], t3[2]), ang3(t3[1], t3[2], t3[3])]);
		if (mitten) {
			// palm and fingers in one piece along the middle finger, bent by the mean flexion of the four
			const mean = [0, 1, 2].map((k) => (sh.f[0][k] + sh.f[1][k] + sh.f[2][k] + sh.f[3][k]) / 4);
			const msh: HandShape = { f: [[], mean, [], []], s: [0, 0, 0, 0], th: sh.th };
			const fp = fingerPts(1, msh).map((p) => [p[0], p[1], 0] as V3);
			// circles across the mitten: the breadth shows in the back or palm view, the thickness in the edge view
			const axis: V3[] = [[0.06, 0, 0], [0.2, 0, 0], [0.34, 0, 0], fp[0], fp[1], fp[2], fp[3]];
			const half = [0.14, 0.18, 0.19, 0.19, 0.18, 0.16, 0.12];
			const tz = Math.hypot(B.t[0], B.t[1]); // how much of the breadth faces the viewer
			const q = axis.map(pr);
			const rr = half.map((h, k) => o.Lh * Math.max(0.065 + (k > 3 ? -0.01 : 0), h * tz));
			// across the breadth: two rows of circles at ±(half − r) along the projected z
			const tzv = { x: B.t[0] * o.Lh, y: B.t[1] * o.Lh };
			const circles: Pt[] = [];
			const radii: number[] = [];
			q.forEach((c, k) => {
				const off = Math.max(0, half[k] - 0.065);
				for (const sgn of [-1, 1]) {
					circles.push({ x: c.x + tzv.x * off * sgn, y: c.y + tzv.y * off * sgn });
					radii.push(0.065 * o.Lh + 0.2);
				}
			});
			void rr;
			const d = blob(circles, radii);
			const z = (q[2].z + q[4].z + q[6].z) / 3;
			const back = zc !== null && z < zc;
			palm.setAttribute('d', back ? '' : d);
			if (backPalm) backPalm.setAttribute('d', back ? d : '');
			items.push({ z, k: 0, e: palm });
		} else {
			const corners: V3[] = [];
			for (const y of [HALF_T, -HALF_T]) {
				corners.push([0.02, y * 0.9, 0.13], [0.02, y * 0.9, -0.12], [0.44, y, 0.2], [0.48, y, 0.07], [0.47, y, -0.07], [0.4, y * 0.9, -0.19]);
			}
			corners.push([0.2, -0.075, 0.16], [0.22, -0.07, -0.16]);
			const cp = corners.map(pr);
			palm.setAttribute('d', smooth(hull(cp)));
			items.push({ z: pr([0.3, 0, 0]).z - 0.02 * o.Lh, k: 0, e: palm });
			for (let i = 0; i < 4; i++) {
				const p = fingerPts(i, sh).map(pr);
				const r = FR[i] * o.Lh;
				const rs = [r, r * 0.96, r * 0.92, r * 0.86];
				chain(p, rs, [sh.f[i][1], sh.f[i][2]]);
			}
		}
		// far to near; within a finger at the same depth, base before tip
		items.sort((a, b) => a.z - b.z || a.k - b.k);
		for (const it of items) g.append(it.e);
		debug.pose = pose;
		debug.dir = fr.dir;
		debug.roll = fr.roll;
		debug.flex = sh.f.map((r) => r.slice());
		debug.spread = sh.s.slice();
		const tb = [TB, ...sh.th];
		debug.thumb = [0, 1, 2].map((k) => vlen(vsub(tb[k + 1], tb[k])));
	};
	return { g, set, setBack, debug, side: o.side, Lh: o.Lh };
};
export type Hand = ReturnType<typeof hand>;
