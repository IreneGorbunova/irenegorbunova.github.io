/**
 * A person in light clothes (a shirt with short sleeves, trousers, low shoes, bare head with short hair), drawn in
 * profile facing right, for ZhidIntro.astro. It follows the person of «Давление. Закон Паскаля»
 * (../davlenie-zakon-paskalya/person.ts): the same proportions, the same outline and the same two-segment inverse
 * kinematics (the knees bend forward, the elbows backward); only the clothes differ. To face left, the caller mirrors
 * the group.
 *
 * Proportions (in parts of the height H): hip joint 0,52 H, thigh 0,24 H, shin 0,235 H, shoulder 0,82 H, upper arm
 * 0,18 H, forearm with the hand 0,17 H, head 0,13 H across. A shoe is 27 см long whatever the height.
 *
 * Colors come from classes `ph-*`; the component that uses the module defines them (from theme variables).
 */
import { el } from '../g7/kit';

export type Pt = { x: number; y: number };

export interface PersonOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth: number; // 1 = average build
	shirt: string; // class of the shirt color
}

export interface Pose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far
	head?: number; // rad, the head turns down
}

/** Height of the ankle above the ground in a shoe, см. */
export const ANKLE = 7.5;

/** The bend joint between a and b for segments l1, l2; side 1 bends forward (knees), −1 backward (elbows). */
export const joint = (a: Pt, b: Pt, l1: number, l2: number, side: 1 | -1): { j: Pt; end: Pt } => {
	let dx = b.x - a.x;
	let dy = b.y - a.y;
	let d = Math.hypot(dx, dy) || 1e-6;
	let end = b;
	const max = (l1 + l2) * 0.999;
	if (d > max) {
		end = { x: a.x + (dx / d) * max, y: a.y + (dy / d) * max };
		dx = end.x - a.x;
		dy = end.y - a.y;
		d = max;
	}
	d = Math.max(d, Math.abs(l1 - l2) + 1e-3);
	const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
	const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
	const ux = dx / d;
	const uy = dy / d;
	return { j: { x: a.x + ux * along + uy * h * side, y: a.y + uy * along - ux * h * side }, end };
};

const f = (v: number) => v.toFixed(2);
const P = (p: Pt) => `${f(p.x)} ${f(p.y)}`;

// a low shoe in centimeters, the ankle at (0, 0), the toe to the right, the ground at y = ANKLE
const SHOE = 'M-5.5 -4 Q-1 -6 4 -4.5 Q8 -1.5 13 0 L18 1.5 Q21 2.5 21 5 L21 7.5 L-6.5 7.5 L-6.5 1 Q-7 -2.5 -5.5 -4 Z';
const SOLE = 'M-6.5 5.8 H21 V7.5 H-6.5 Z';

/** Builds a person into `g` and returns the function that poses it. */
export const person = (g: SVGGElement, o: PersonOpts) => {
	g.replaceChildren();
	const u = o.s * o.H; // px per body height
	const th = 0.24 * u;
	const sh = 0.235 * u;
	const ua = 0.18 * u;
	const fa = 0.17 * u;
	const gw = Math.pow(o.girth, 0.8);
	const W = 0.16 * u * o.girth; // depth of the body
	const r = 0.064 * u; // head
	const S = o.s;

	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	type Limb = { set: (d: string) => void };
	const limb = (parent: Element, cls: string, w: number): Limb => {
		const a = mk(parent, 'path', { class: 'ph-outline', 'stroke-width': f(w + 1.4) });
		const b = mk(parent, 'path', { class: cls, 'stroke-width': f(w) });
		return { set: (d) => (a.setAttribute('d', d), b.setAttribute('d', d)) };
	};
	// an arm: bare skin with a short sleeve over the upper part, and a hand
	type Arm = { skin: Limb; sleeve: Limb; hand: SVGEllipseElement };
	const armOf = (parent: Element, w: number): Arm => ({
		skin: limb(parent, 'ph-skin-limb', w * 0.82),
		sleeve: limb(parent, `ph-sleeve ${o.shirt}`, w * 1.12),
		hand: mk(parent, 'ellipse', { class: 'ph-skin', rx: f(0.042 * u), ry: f(0.028 * u) }),
	});

	// layers, back to front
	const far = mk(g, 'g', { class: 'ph-far' });
	const farArm = armOf(far, 0.058 * u * gw);
	const farLeg = limb(far, 'ph-pants', 0.078 * u * gw);
	const farFoot = mk(far, 'g', {});
	const near = mk(g, 'g', {});
	const nearLeg = limb(near, 'ph-pants', 0.084 * u * gw);
	const nearFoot = mk(near, 'g', {});
	const neck = mk(g, 'path', { class: 'ph-skin' });
	const torso = mk(g, 'path', { class: `ph-shirt ${o.shirt}` });
	const belt = mk(g, 'path', { class: 'ph-belt' });
	const collar = mk(g, 'path', { class: 'ph-collar' });
	const head = mk(g, 'g', {});
	const nearArm = armOf(g, 0.062 * u * gw);

	// the head around its center
	mk(head, 'circle', { class: 'ph-skin', r: f(r) });
	mk(head, 'path', { class: 'ph-skin', d: `M${f(0.9 * r)} ${f(-0.05 * r)} Q${f(1.32 * r)} ${f(0.22 * r)} ${f(0.92 * r)} ${f(0.38 * r)} Z` });
	mk(head, 'path', {
		class: 'ph-hair',
		d: `M${f(-1.04 * r)} ${f(0.42 * r)} Q${f(-1.25 * r)} ${f(-0.9 * r)} ${f(-0.1 * r)} ${f(-1.1 * r)} Q${f(0.85 * r)} ${f(-1.12 * r)} ${f(1.0 * r)} ${f(-0.42 * r)} Q${f(0.55 * r)} ${f(-0.66 * r)} ${f(0.1 * r)} ${f(-0.5 * r)} Q${f(-0.25 * r)} ${f(-0.2 * r)} ${f(-0.42 * r)} ${f(0.42 * r)} Z`,
	});
	mk(head, 'circle', { class: 'ph-cheek', cx: f(0.5 * r), cy: f(0.38 * r), r: f(0.22 * r) });
	mk(head, 'circle', { class: 'ph-eye', cx: f(0.56 * r), cy: f(0.02 * r), r: f(Math.max(0.8, 0.1 * r)) });
	mk(head, 'path', { class: 'ph-brow', d: `M${f(0.4 * r)} ${f(-0.2 * r)} L${f(0.75 * r)} ${f(-0.22 * r)}` });
	mk(head, 'path', { class: 'ph-mouth', d: `M${f(0.6 * r)} ${f(0.62 * r)} Q${f(0.75 * r)} ${f(0.68 * r)} ${f(0.85 * r)} ${f(0.58 * r)}` });
	mk(head, 'ellipse', { class: 'ph-skin ph-ear', cx: f(-0.12 * r), cy: f(0.1 * r), rx: f(0.18 * r), ry: f(0.24 * r) });

	const shoe = (parent: SVGGElement) => {
		mk(parent, 'path', { class: 'ph-shoe', d: SHOE, 'vector-effect': 'non-scaling-stroke' });
		mk(parent, 'path', { class: 'ph-sole', d: SOLE });
	};
	shoe(nearFoot);
	shoe(farFoot);

	const leg = (path: Limb, foot: SVGGElement, hip: Pt, ankle: Pt, angle: number) => {
		const { j, end } = joint(hip, ankle, th, sh, 1);
		path.set(`M${P(hip)} L${P(j)} L${P(end)}`);
		foot.setAttribute('transform', `translate(${P(end)}) rotate(${f((angle * 180) / Math.PI)}) scale(${S})`);
	};
	const arm = (a: Arm, s0: Pt, hand: Pt) => {
		const { j, end } = joint(s0, hand, ua, fa, -1);
		a.skin.set(`M${P(s0)} L${P(j)} L${P(end)}`);
		const k = 0.55; // the sleeve covers a little more than half of the upper arm
		a.sleeve.set(`M${P(s0)} L${P({ x: s0.x + (j.x - s0.x) * k, y: s0.y + (j.y - s0.y) * k })}`);
		const ang = (Math.atan2(end.y - j.y, end.x - j.x) * 180) / Math.PI;
		a.hand.setAttribute('transform', `translate(${P(end)}) rotate(${f(ang)})`);
		return end;
	};

	return (p: Pose) => {
		const ax = Math.sin(p.lean);
		const ay = -Math.cos(p.lean);
		// a point of the body: `a` along the spine from the hip joint, `b` across it (to the front)
		const at = (a: number, b: number): Pt => ({ x: p.hip.x + ax * a - ay * b, y: p.hip.y + ay * a + ax * b });
		const L = 0.3 * u; // hip joint to shoulder
		const belly = W * (0.5 + 0.18 * Math.max(0, o.girth - 1));
		const b0 = at(-0.06 * u, -0.5 * W);
		const b1 = at(0.12 * u, -0.5 * W);
		const b2 = at(L - 0.02 * u, -0.46 * W);
		const b3 = at(L + 0.03 * u, -0.18 * W);
		const b4 = at(L + 0.03 * u, 0.2 * W);
		const b5 = at(L - 0.03 * u, 0.46 * W);
		const b6 = at(0.12 * u, belly);
		const b7 = at(-0.06 * u, 0.5 * W);
		torso.setAttribute('d', `M${P(b0)} C${P(b1)} ${P(b1)} ${P(b2)} Q${P(at(L + 0.035 * u, -0.46 * W))} ${P(b3)} L${P(b4)} Q${P(at(L + 0.025 * u, 0.46 * W))} ${P(b5)} C${P(b6)} ${P(b6)} ${P(b7)} Z`);
		belt.setAttribute('d', `M${P(at(-0.035 * u, -0.5 * W))} L${P(at(-0.035 * u, 0.5 * W))} L${P(at(-0.06 * u, 0.5 * W))} L${P(at(-0.06 * u, -0.5 * W))} Z`);
		collar.setAttribute('d', `M${P(at(L + 0.03 * u, -0.12 * W))} L${P(at(L - 0.02 * u, 0.06 * W))} L${P(at(L + 0.03 * u, 0.2 * W))}`);
		const hc = at(L + 0.1 * u, 0.1 * W);
		neck.setAttribute('d', `M${P(at(L, -0.16 * W))} L${P(at(L + 0.07 * u, -0.12 * W))} L${P(at(L + 0.07 * u, 0.2 * W))} L${P(at(L, 0.2 * W))} Z`);
		head.setAttribute('transform', `translate(${P(hc)}) rotate(${f(((p.lean * 0.4 + (p.head ?? 0)) * 180) / Math.PI)})`);
		leg(farLeg, farFoot, at(0, -0.04 * W), p.ankles[1], p.feet[1]);
		leg(nearLeg, nearFoot, at(0, 0.04 * W), p.ankles[0], p.feet[0]);
		arm(farArm, at(L - 0.03 * u, 0.06 * W), p.hands[1]);
		arm(nearArm, at(L - 0.03 * u, -0.02 * W), p.hands[0]);
	};
};
