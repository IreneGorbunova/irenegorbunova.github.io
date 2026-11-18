/**
 * A person in swimwear, drawn in profile facing right, for the pictures of «Архимедова сила. Плавание тел» (the ball
 * in the pool, the Dead Sea). It is the reference person of «Давление твёрдых тел»
 * (../davlenie-zakon-paskalya/person.ts) undressed for the beach: the same construction (thick round strokes over a
 * dark outline, the knees and elbows bent by that module's `joint`), the same proportions in parts of the height H
 * (hip joint 0,52 H, thigh 0,24 H, shin 0,235 H, shoulder 0,82 H, upper arm 0,18 H, forearm with the hand 0,17 H,
 * head 0,128 H across), the same face. Bare skin, swim trunks, short hair, bare feet 25 см long.
 *
 * The pose works at any angle: `lean` = 0 stands upright, −π/2 lies on the back with the head to the left and the
 * face up (then pass `head` = −0,6·π/2 so that the face looks straight up).
 *
 * Colors come from classes `sw-*`, defined in SwimmerStyles.astro (from theme variables); the trunks color is the
 * caller's class.
 */
import { el } from '../g7/kit';
import { joint, type Pt } from '../davlenie-zakon-paskalya/person';

export type { Pt };

export interface SwimmerOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth: number; // 1 = average build
	suit: string; // class of the trunks color
}

export interface SwimPose {
	hip: Pt;
	lean: number; // rad, the body leans forward (−π/2: lying on the back)
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far
	head?: number; // rad, the head turns down
	knees?: 1 | -1; // 1 = the knees bend forward (default)
}

/** Height of the ankle above the sole of a bare foot, см. */
export const ANKLE = 7;

const f = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f(p.x)} ${f(p.y)}`;

// a bare foot in centimeters, the ankle at (0, 0), the toes to the right, the sole at y = ANKLE
const FOOT = 'M-4.5 -4.5 Q-7 0 -6.5 4 Q-6.3 7 -3 7 L15.5 7 Q20 7 20 4.6 Q20 2.4 16 1.6 L6.5 -0.8 Q3.6 -2.2 3.2 -5.2 Z';
const TOES = 'M15.5 3 Q17.2 3.4 18.2 4.6 M12.6 3 Q13.6 3.6 14.2 4.8';

/** Builds a swimmer into `g` and returns the function that poses it. */
export const swimmer = (g: SVGGElement, o: SwimmerOpts) => {
	g.replaceChildren();
	const u = o.s * o.H; // px per body height
	const th = 0.24 * u;
	const sh = 0.235 * u;
	const ua = 0.18 * u;
	const fa = 0.17 * u;
	const gw = Math.pow(o.girth, 0.8);
	const W = 0.17 * u * o.girth; // depth of the body
	const r = 0.064 * u; // head radius
	const S = o.s;

	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	type Limb = { set: (d: string) => void };
	const limb = (parent: Element, cls: string, w: number): Limb => {
		const a = mk(parent, 'path', { class: 'sw-outline', 'stroke-width': f(w + 1.6) });
		const b = mk(parent, 'path', { class: cls, 'stroke-width': f(w) });
		return { set: (d) => (a.setAttribute('d', d), b.setAttribute('d', d)) };
	};
	const legW = 0.084 * u * gw;
	const armW = 0.062 * u * gw;
	// layers, back to front
	const far = mk(g, 'g', { class: 'sw-far' });
	const farArm = limb(far, 'sw-limb', armW * 0.95);
	const farHand = mk(far, 'ellipse', { class: 'sw-skin', rx: f(0.045 * u), ry: f(0.03 * u) });
	const farLeg = limb(far, 'sw-limb', legW * 0.93);
	const farTrunk = mk(far, 'path', { class: `sw-trunk ${o.suit}`, 'stroke-width': f(legW * 0.93 + 1.6) });
	const farFoot = mk(far, 'g', {});
	const nearLeg = limb(g, 'sw-limb', legW);
	const nearFoot = mk(g, 'g', {});
	const neck = limb(g, 'sw-limb', 0.05 * u * gw);
	const torso = mk(g, 'path', { class: 'sw-skin' });
	const trunks = mk(g, 'path', { class: `sw-suit ${o.suit}` });
	const nearTrunk = mk(g, 'path', { class: `sw-trunk ${o.suit}`, 'stroke-width': f(legW) });
	const navel = mk(g, 'circle', { class: 'sw-dot', r: f(Math.max(0.5, 0.006 * u)) });
	const head = mk(g, 'g', {});
	const nearArm = limb(g, 'sw-limb', armW);
	const nearHand = mk(g, 'ellipse', { class: 'sw-skin', rx: f(0.047 * u), ry: f(0.031 * u) });

	// the head around its center: hair at the back and on top, the face of the reference person
	mk(head, 'path', { class: 'sw-hair', d: `M${f(-1.02 * r)} ${f(0.3 * r)} Q${f(-1.15 * r)} ${f(0.75 * r)} ${f(-0.6 * r)} ${f(0.8 * r)} L${f(-0.3 * r)} ${f(0.1 * r)} Z` });
	mk(head, 'circle', { class: 'sw-skin', r: f(r) });
	mk(head, 'path', { class: 'sw-skin', d: `M${f(0.9 * r)} ${f(-0.05 * r)} Q${f(1.32 * r)} ${f(0.22 * r)} ${f(0.92 * r)} ${f(0.38 * r)} Z` });
	mk(head, 'circle', { class: 'sw-cheek', cx: f(0.5 * r), cy: f(0.38 * r), r: f(0.22 * r) });
	mk(head, 'circle', { class: 'sw-eye', cx: f(0.56 * r), cy: f(0.02 * r), r: f(Math.max(0.9, 0.1 * r)) });
	mk(head, 'path', { class: 'sw-brow', d: `M${f(0.4 * r)} ${f(-0.22 * r)} Q${f(0.58 * r)} ${f(-0.32 * r)} ${f(0.76 * r)} ${f(-0.22 * r)}` });
	mk(head, 'path', { class: 'sw-mouth', d: `M${f(0.6 * r)} ${f(0.62 * r)} Q${f(0.75 * r)} ${f(0.68 * r)} ${f(0.85 * r)} ${f(0.58 * r)}` });
	mk(head, 'ellipse', { class: 'sw-skin sw-ear', cx: f(-0.12 * r), cy: f(0.1 * r), rx: f(0.18 * r), ry: f(0.24 * r) });
	mk(head, 'path', {
		class: 'sw-hair',
		d: `M${f(-1.04 * r)} ${f(0.28 * r)} Q${f(-1.22 * r)} ${f(-0.9 * r)} ${f(-0.1 * r)} ${f(-1.1 * r)} Q${f(0.85 * r)} ${f(-1.18 * r)} ${f(1.0 * r)} ${f(-0.42 * r)} Q${f(0.7 * r)} ${f(-0.7 * r)} ${f(0.3 * r)} ${f(-0.55 * r)} Q${f(-0.2 * r)} ${f(-0.45 * r)} ${f(-0.42 * r)} ${f(-0.05 * r)} L${f(-0.6 * r)} ${f(0.35 * r)} Z`,
	});

	const foot = (parent: SVGGElement) => {
		mk(parent, 'path', { class: 'sw-skin sw-foot', d: FOOT, 'vector-effect': 'non-scaling-stroke' });
		mk(parent, 'path', { class: 'sw-toes', d: TOES, 'vector-effect': 'non-scaling-stroke' });
	};
	foot(nearFoot);
	foot(farFoot);

	const leg = (path: Limb, trunk: SVGPathElement, ft: SVGGElement, hip: Pt, ankle: Pt, angle: number, side: 1 | -1) => {
		const { j, end } = joint(hip, ankle, th, sh, side);
		path.set(`M${P(hip)} L${P(j)} L${P(end)}`);
		// the trunks cover the upper third of the thigh
		const k = 0.3;
		trunk.setAttribute('d', `M${P(hip)} L${P({ x: hip.x + (j.x - hip.x) * k, y: hip.y + (j.y - hip.y) * k })}`);
		ft.setAttribute('transform', `translate(${P(end)}) rotate(${f((angle * 180) / Math.PI)}) scale(${S})`);
	};
	const arm = (path: Limb, hand: SVGEllipseElement, sh0: Pt, target: Pt) => {
		const { j, end } = joint(sh0, target, ua, fa, -1);
		// the hand: an oval along the forearm, its center a little short of the fingertips
		const dx = end.x - j.x;
		const dy = end.y - j.y;
		const d = Math.hypot(dx, dy) || 1;
		const c = { x: end.x - (dx / d) * 0.03 * u, y: end.y - (dy / d) * 0.03 * u };
		path.set(`M${P(sh0)} L${P(j)} L${P(c)}`);
		hand.setAttribute('cx', f(c.x));
		hand.setAttribute('cy', f(c.y));
		hand.setAttribute('transform', `rotate(${f((Math.atan2(dy, dx) * 180) / Math.PI)} ${P(c)})`);
		return end;
	};

	return (p: SwimPose) => {
		const ax = Math.sin(p.lean);
		const ay = -Math.cos(p.lean);
		const at = (a: number, b: number): Pt => ({ x: p.hip.x + ax * a - ay * b, y: p.hip.y + ay * a + ax * b });
		const L = 0.3 * u; // hip joint to shoulder
		const belly = W * (0.5 + 0.18 * Math.max(0, o.girth - 1));
		const b0 = at(-0.07 * u, -0.5 * W);
		const b1 = at(0.12 * u, -0.5 * W);
		const b2 = at(L - 0.02 * u, -0.46 * W);
		const b3 = at(L + 0.035 * u, -0.2 * W);
		const b4 = at(L + 0.035 * u, 0.22 * W);
		const b5 = at(L - 0.03 * u, 0.5 * W);
		const b6 = at(0.12 * u, belly);
		const b7 = at(-0.07 * u, 0.5 * W);
		torso.setAttribute('d', `M${P(b0)} C${P(b1)} ${P(b1)} ${P(b2)} Q${P(at(L + 0.04 * u, -0.46 * W))} ${P(b3)} L${P(b4)} Q${P(at(L + 0.03 * u, 0.5 * W))} ${P(b5)} C${P(b6)} ${P(b6)} ${P(b7)} Z`);
		// the trunks: from the hip joint a little below to 0,07 H above it
		trunks.setAttribute('d', `M${P(at(-0.06 * u, -0.5 * W))} L${P(at(0.06 * u, -0.52 * W))} Q${P(at(0.07 * u, 0))} ${P(at(0.06 * u, belly * 0.98))} L${P(at(-0.04 * u, 0.48 * W))} Q${P(at(-0.08 * u, 0))} ${P(at(-0.06 * u, -0.5 * W))} Z`);
		const nv = at(0.12 * u, belly - 0.1 * W);
		navel.setAttribute('cx', f(nv.x));
		navel.setAttribute('cy', f(nv.y));
		const hc = at(L + 0.105 * u, 0.12 * W);
		neck.set(`M${P(at(L - 0.02 * u, 0.06 * W))} L${P(at(L + 0.06 * u, 0.1 * W))}`);
		head.setAttribute('transform', `translate(${P(hc)}) rotate(${f(((p.lean * 0.4 + (p.head ?? 0)) * 180) / Math.PI)})`);
		const side = p.knees ?? 1;
		leg(farLeg, farTrunk, farFoot, at(0, -0.04 * W), p.ankles[1], p.feet[1], side);
		leg(nearLeg, nearTrunk, nearFoot, at(0, 0.04 * W), p.ankles[0], p.feet[0], side);
		arm(farArm, farHand, at(L - 0.03 * u, 0.06 * W), p.hands[1]);
		arm(nearArm, nearHand, at(L - 0.03 * u, -0.02 * W), p.hands[0]);
	};
};
