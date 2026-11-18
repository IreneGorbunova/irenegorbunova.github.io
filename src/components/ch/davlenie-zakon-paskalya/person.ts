/**
 * A person in winter clothes, drawn in profile facing right, for DavIntro.astro (the snow scene) and
 * PressureLab.astro. The caller gives a pose in its own SVG coordinates (px): the hip joint, the lean of the body,
 * both ankles with the angles of the feet, both hands; the module bends knees and elbows itself (two-segment
 * inverse kinematics: the knees bend forward, the elbows backward).
 *
 * Proportions are those of an adult (in parts of the height H): hip joint 0,52 H, knee 0,28 H, ankle 0,045 H,
 * shoulder 0,82 H, upper arm 0,18 H, forearm with the hand 0,17 H. The footwear keeps its real size whatever the
 * height: a winter boot 28 см long (its sole is about 150 см²), a ski 180 × 8 см, a snowshoe 60 × 25 см, a skate blade
 * 27 см long under the boot. `girth` (1 for an average build) makes the body and the limbs thicker or thinner.
 *
 * Colors come from classes `pp-*`; the component that uses the module defines them (from theme variables).
 */
import { el } from '../g7/kit';

export type Pt = { x: number; y: number };
export type Gear = 'boot' | 'ski' | 'shoe' | 'skate';

export interface PersonOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth: number; // 1 = average build
	gear: Gear;
	coat: string; // class of the jacket color
	poles?: boolean;
}

export interface Pose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far
	poleTips?: [Pt, Pt];
	head?: number; // rad, the head turns down
}

/** Height of the ankle above the ground under the footwear, см. */
export const ANKLE: Record<Gear, number> = { boot: 8, ski: 10.5, shoe: 9.5, skate: 15.5 };

/** The bend joint between a and b for segments l1, l2; side 1 bends to the right of a→b turned clockwise (knees forward). */
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

const f = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f(p.x)} ${f(p.y)}`;

// footwear outlines in centimeters, the ankle at (0, 0), the toe to the right, the ground at y = ANKLE
const BOOT = 'M-6.5 -11 L5.5 -11 Q6.5 -4 9.5 -1.5 L17 1.5 Q21.5 3 21.5 6 L21.5 8 L-8 8 L-8 1 Q-8.5 -6 -6.5 -11 Z';
const SOLE = 'M-8 5.6 H21.5 V8 H-8 Z';
const CUFF = 'M-7.2 -11 H6.2 V-7.6 H-7.6 Z';
const SKI = 'M-84 8.2 H82 Q94 8.2 100 0.6 L101.6 1.8 Q95.5 10.6 82 10.6 H-84 Q-86 10.6 -86 9.4 Q-86 8.2 -84 8.2 Z';
const BIND = 'M-9 6.2 H23 V8.4 H-9 Z';
const BLADE = 'M-9.5 13.2 H22 Q27 13.2 27.5 10.5 L29 11 Q28.6 15.6 22 15.6 H-9.5 Z';
const HOLDER = 'M-6.5 8 L-5.5 13.4 L-1.5 13.4 L-0.5 8 Z M12.5 8 L13.5 13.4 L18 13.4 L19 8 Z';

/** Builds a person into `g` and returns the function that poses it. */
export const person = (g: SVGGElement, o: PersonOpts) => {
	g.replaceChildren();
	const u = o.s * o.H; // px per body height
	const th = 0.24 * u; // thigh
	const sh = 0.235 * u; // shin
	const ua = 0.18 * u; // upper arm
	const fa = 0.17 * u; // forearm with the hand
	const gw = Math.pow(o.girth, 0.8);
	const W = 0.17 * u * o.girth; // depth of the body
	const headR = 0.064 * u;
	const S = o.s;

	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	// a limb: a thick round stroke over a slightly thicker dark one (the outline)
	type Limb = { set: (d: string) => void };
	const limb = (parent: Element, cls: string, w: number): Limb => {
		const a = mk(parent, 'path', { class: 'pp-outline', 'stroke-width': f(w + 1.6) });
		const b = mk(parent, 'path', { class: cls, 'stroke-width': f(w) });
		return { set: (d) => (a.setAttribute('d', d), b.setAttribute('d', d)) };
	};
	// layers, back to front
	const far = mk(g, 'g', { class: 'pp-far' });
	const farPole = o.poles ? mk(far, 'path', { class: 'pp-pole' }) : null;
	const farArm = limb(far, `pp-sleeve ${o.coat}`, 0.062 * u * gw);
	const farMit = mk(far, 'circle', { class: 'pp-mitten', r: f(0.034 * u) });
	const farLeg = limb(far, 'pp-pants', 0.078 * u * gw);
	const farFoot = mk(far, 'g', {});
	const near = mk(g, 'g', {});
	const nearLeg = limb(near, 'pp-pants', 0.084 * u * gw);
	const nearFoot = mk(near, 'g', {});
	const body = mk(g, 'g', {});
	const torso = mk(body, 'path', { class: `pp-coat ${o.coat}` });
	const zip = mk(body, 'path', { class: 'pp-zip' });
	const head = mk(body, 'g', {});
	const scarf = mk(g, 'path', { class: 'pp-scarf' });
	const nearPole = o.poles ? mk(g, 'path', { class: 'pp-pole' }) : null;
	const nearArm = limb(g, `pp-sleeve ${o.coat}`, 0.066 * u * gw);
	const nearMit = mk(g, 'circle', { class: 'pp-mitten', r: f(0.036 * u) });

	// the head, drawn around its center with radius r
	const r = headR;
	mk(head, 'path', { class: 'pp-hair', d: `M${f(-0.98 * r)} ${f(-0.2 * r)} Q${f(-1.12 * r)} ${f(0.55 * r)} ${f(-0.55 * r)} ${f(0.78 * r)} L${f(-0.2 * r)} ${f(0.1 * r)} Z` });
	mk(head, 'circle', { class: 'pp-skin', r: f(r) });
	mk(head, 'path', { class: 'pp-skin', d: `M${f(0.9 * r)} ${f(-0.05 * r)} Q${f(1.32 * r)} ${f(0.22 * r)} ${f(0.92 * r)} ${f(0.38 * r)} Z` });
	mk(head, 'circle', { class: 'pp-cheek', cx: f(0.5 * r), cy: f(0.38 * r), r: f(0.22 * r) });
	mk(head, 'circle', { class: 'pp-eye', cx: f(0.56 * r), cy: f(0.02 * r), r: f(Math.max(0.9, 0.1 * r)) });
	mk(head, 'path', { class: 'pp-mouth', d: `M${f(0.6 * r)} ${f(0.62 * r)} Q${f(0.75 * r)} ${f(0.68 * r)} ${f(0.85 * r)} ${f(0.58 * r)}` });
	mk(head, 'ellipse', { class: 'pp-skin pp-ear', cx: f(-0.12 * r), cy: f(0.1 * r), rx: f(0.18 * r), ry: f(0.24 * r) });
	mk(head, 'path', { class: 'pp-hat', d: `M${f(-1.1 * r)} ${f(-0.05 * r)} Q${f(-1.2 * r)} ${f(-1.25 * r)} ${f(0.05 * r)} ${f(-1.22 * r)} Q${f(1.05 * r)} ${f(-1.1 * r)} ${f(1.04 * r)} ${f(-0.32 * r)} Z` });
	mk(head, 'path', { class: 'pp-hat-band', d: `M${f(-1.14 * r)} ${f(0.02 * r)} L${f(1.08 * r)} ${f(-0.3 * r)} L${f(1.02 * r)} ${f(-0.62 * r)} L${f(-1.12 * r)} ${f(-0.36 * r)} Z` });
	mk(head, 'circle', { class: 'pp-pompom', cx: f(-0.45 * r), cy: f(-1.32 * r), r: f(0.32 * r) });

	const gear = (parent: SVGGElement, isNear: boolean) => {
		const cls = isNear ? '' : ' pp-far-gear';
		if (o.gear === 'ski') {
			mk(parent, 'path', { class: `pp-ski${cls}`, d: SKI, 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: 'pp-bind', d: BIND });
		}
		if (o.gear === 'shoe') {
			// a snowshoe, seen a little from above: an oval frame with a lattice, 60 × 25 см
			const cx = 6;
			const cy = 9.5;
			const rx = 30;
			const ry = 6.5;
			mk(parent, 'ellipse', { class: 'pp-shoe', cx, cy, rx, ry, 'vector-effect': 'non-scaling-stroke' });
			let d = '';
			for (let x = -24; x <= 30; x += 6) {
				const h = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
				d += `M${x} ${f(cy - h)} V${f(cy + h)} `;
			}
			d += `M${cx - rx + 3} ${cy} H${cx + rx - 3}`;
			mk(parent, 'path', { class: 'pp-lattice', d, 'vector-effect': 'non-scaling-stroke' });
		}
		mk(parent, 'path', { class: 'pp-boot', d: BOOT, 'vector-effect': 'non-scaling-stroke' });
		mk(parent, 'path', { class: 'pp-sole', d: SOLE });
		mk(parent, 'path', { class: 'pp-cuff', d: CUFF });
		if (o.gear === 'shoe') {
			mk(parent, 'path', { class: 'pp-shoe-rim', d: 'M-24 9.5 A30 6.5 0 0 0 36 9.5', 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: 'pp-strap', d: 'M4 -2 L12 1.5 L12 4 L3 0.5 Z M-6.5 -4 L-1 -4 L-1 -1.5 L-7 -1.5 Z' });
		}
		if (o.gear === 'skate') {
			mk(parent, 'path', { class: 'pp-holder', d: HOLDER });
			mk(parent, 'path', { class: 'pp-blade', d: BLADE, 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: 'pp-lace', d: 'M-2 -9 L4 -9 M-1 -6 L5 -6 M0 -3 L7 -3', 'vector-effect': 'non-scaling-stroke' });
		}
	};
	gear(nearFoot, true);
	gear(farFoot, false);

	const leg = (path: Limb, foot: SVGGElement, hip: Pt, ankle: Pt, angle: number) => {
		const { j, end } = joint(hip, ankle, th, sh, 1);
		path.set(`M${P(hip)} L${P(j)} L${P(end)}`);
		foot.setAttribute('transform', `translate(${P(end)}) rotate(${f((angle * 180) / Math.PI)}) scale(${S})`);
	};
	const arm = (path: Limb, mit: SVGCircleElement, sh0: Pt, hand: Pt) => {
		const { j, end } = joint(sh0, hand, ua, fa, -1);
		path.set(`M${P(sh0)} L${P(j)} L${P(end)}`);
		mit.setAttribute('cx', f(end.x));
		mit.setAttribute('cy', f(end.y));
		return end;
	};

	return (p: Pose) => {
		const ax = Math.sin(p.lean);
		const ay = -Math.cos(p.lean);
		// a point of the body: `a` along the spine from the hip joint, `b` across it (to the front)
		const at = (a: number, b: number): Pt => ({ x: p.hip.x + ax * a - ay * b, y: p.hip.y + ay * a + ax * b });
		const L = 0.3 * u; // hip joint to shoulder
		const belly = W * (0.5 + 0.18 * Math.max(0, o.girth - 1));
		const pts = [
			at(-0.07 * u, -0.5 * W),
			at(0.12 * u, -0.52 * W),
			at(L - 0.02 * u, -0.46 * W),
			at(L + 0.035 * u, -0.2 * W),
			at(L + 0.035 * u, 0.22 * W),
			at(L - 0.03 * u, 0.48 * W),
			at(0.12 * u, belly),
			at(-0.07 * u, 0.5 * W),
		];
		const [b0, b1, b2, b3, b4, b5, b6, b7] = pts;
		torso.setAttribute('d', `M${P(b0)} C${P(b1)} ${P(b1)} ${P(b2)} Q${P(at(L + 0.04 * u, -0.46 * W))} ${P(b3)} L${P(b4)} Q${P(at(L + 0.03 * u, 0.48 * W))} ${P(b5)} C${P(b6)} ${P(b6)} ${P(b7)} Z`);
		zip.setAttribute('d', `M${P(at(L - 0.01 * u, 0.36 * W))} C${P(at(0.12 * u, belly - 0.08 * W))} ${P(at(0.12 * u, belly - 0.08 * W))} ${P(at(-0.06 * u, 0.4 * W))}`);
		scarf.setAttribute('d', `M${P(at(L + 0.045 * u, -0.28 * W))} L${P(at(L + 0.05 * u, 0.3 * W))} L${P(at(L - 0.02 * u, 0.32 * W))} L${P(at(L - 0.03 * u, -0.3 * W))} Z M${P(at(L, 0.2 * W))} L${P(at(L - 0.13 * u, 0.36 * W))} L${P(at(L - 0.12 * u, 0.12 * W))} L${P(at(L - 0.01 * u, 0.0))} Z`);
		const hc = at(L + 0.105 * u, 0.12 * W);
		head.setAttribute('transform', `translate(${P(hc)}) rotate(${f(((p.lean * 0.4 + (p.head ?? 0)) * 180) / Math.PI)})`);
		const shoulder = at(L - 0.03 * u, -0.02 * W);
		leg(farLeg, farFoot, at(0, -0.04 * W), p.ankles[1], p.feet[1]);
		leg(nearLeg, nearFoot, at(0, 0.04 * W), p.ankles[0], p.feet[0]);
		const hf = arm(farArm, farMit, at(L - 0.03 * u, 0.06 * W), p.hands[1]);
		const hn = arm(nearArm, nearMit, shoulder, p.hands[0]);
		if (farPole && p.poleTips) farPole.setAttribute('d', `M${P({ x: hf.x + 0.02 * u, y: hf.y - 0.035 * u })} L${P(p.poleTips[1])}`);
		if (nearPole && p.poleTips) nearPole.setAttribute('d', `M${P({ x: hn.x + 0.02 * u, y: hn.y - 0.035 * u })} L${P(p.poleTips[0])}`);
	};
};
