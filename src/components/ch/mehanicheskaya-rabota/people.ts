/**
 * People in indoor clothes for the pictures of «Механическая работа и мощность», in the style of the person of
 * «Давление. Закон Паскаля» (davlenie-zakon-paskalya/person.ts, whose knee and elbow solver `joint` it reuses): the
 * same proportions (in parts of the height H: hip joint 0,52 H, thigh 0,24 H, shin 0,235 H, shoulder 0,82 H, upper
 * arm 0,18 H, forearm with the hand 0,17 H, head radius 0,064 H, about 7½ heads in all), the same outline, the far
 * limbs a little darker. Instead of the winter clothes: hair (short or a ponytail), a shirt or a sleeveless singlet,
 * trousers or shorts, trainers 26 см long for a grown-up (shorter for a child: in proportion to the height).
 *
 * The caller gives a pose in its own SVG coordinates (px): the hip joint, the lean of the body, the ankles, the angles
 * of the feet, the hands. A hand is a fist round what it holds, or, when `palms` gives an angle, a flat hand seen from
 * its edge (fingers along that angle), as when one presses on a wall. `dir: -1` draws the person facing left (the
 * caller still passes real coordinates). Colors come from the classes `hm-*` (PeopleStyles.astro).
 */
import { el } from '../g7/kit';
import { joint, type Pt } from '../davlenie-zakon-paskalya/person';

export type { Pt };

export interface HumanOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth?: number; // 1 = average build
	shirt: string; // class of the shirt color
	hair?: 'short' | 'pony';
	bare?: boolean; // a sleeveless singlet: bare arms
	shorts?: boolean;
	dir?: 1 | -1; // 1 faces right, −1 faces left
}

export interface HumanPose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far: the center of the fist or of the flat hand
	palms?: [number | null, number | null]; // rad, the direction of the fingers of a flat hand (−π/2 = up)
	head?: number; // rad, the head turns down
}

/** Height of the ankle above the floor in trainers, см (for a grown-up; a child's foot is smaller in proportion). */
export const ANKLE = 7;

const f = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f(p.x)} ${f(p.y)}`;

// a trainer in centimeters, the ankle at (0, 0), the toe to the right, the floor at y = ANKLE
const SHOE = 'M-6 -5 L4.5 -5 Q5.5 -1.5 9 -0.5 L16.5 1.2 Q20 2.3 20 4.6 L20 7 L-7.5 7 L-7.5 1 Q-7.5 -3.2 -6 -5 Z';
const SOLE = 'M-7.5 5 H20 V7 H-7.5 Z';
const LACE = 'M3 -3.4 L6.5 -1 M5.5 -1.8 L9 0.3';

/** Builds a person into `g` and returns the function that poses it. */
export const human = (g: SVGGElement, o: HumanOpts) => {
	g.replaceChildren();
	const dir = o.dir ?? 1;
	const girth = o.girth ?? 1;
	const u = o.s * o.H; // px per body height
	const th = 0.24 * u;
	const sh = 0.235 * u;
	const ua = 0.18 * u;
	const fa = 0.17 * u; // forearm with the fist
	const fw = 0.135 * u; // forearm to the wrist, for a flat hand
	const handL = 0.1 * u;
	const gw = Math.pow(girth, 0.8);
	const W = 0.15 * u * girth; // depth of the body
	const r = 0.064 * u; // head
	const foot = o.s * Math.min(1, o.H / 172); // footwear scale, px per см of a grown-up's shoe

	const root = el('g', dir < 0 ? { transform: 'scale(-1 1)' } : {});
	g.append(root);
	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	type Limb = { set: (d: string) => void };
	const limb = (parent: Element, cls: string, w: number): Limb => {
		const a = mk(parent, 'path', { class: 'hm-outline', 'stroke-width': f(w + 1.4) });
		const b = mk(parent, 'path', { class: cls, 'stroke-width': f(w) });
		return { set: (d) => (a.setAttribute('d', d), b.setAttribute('d', d)) };
	};
	const armCls = o.bare ? 'hm-limb-skin' : `hm-limb ${o.shirt}`;
	const legCls = o.shorts ? 'hm-limb-skin' : 'hm-limb hm-pants';

	// layers, back to front
	const far = mk(root, 'g', { class: 'hm-far' });
	const farArm = limb(far, armCls, 0.058 * u * gw);
	const farHand = mk(far, 'path', { class: 'hm-skin' });
	const farLeg = limb(far, legCls, 0.074 * u * gw);
	const farShort = o.shorts ? limb(far, 'hm-limb hm-pants', 0.086 * u * gw) : null;
	const farFoot = mk(far, 'g', {});
	const near = mk(root, 'g', {});
	const nearLeg = limb(near, legCls, 0.08 * u * gw);
	const nearShort = o.shorts ? limb(near, 'hm-limb hm-pants', 0.092 * u * gw) : null;
	const nearFoot = mk(near, 'g', {});
	const neck = mk(root, 'path', { class: 'hm-skin' });
	const torso = mk(root, 'path', { class: `hm-shirt ${o.shirt}` });
	const seam = mk(root, 'path', { class: 'hm-seam' });
	const head = mk(root, 'g', {});
	const nearArm = limb(root, armCls, 0.062 * u * gw);
	const nearHand = mk(root, 'path', { class: 'hm-skin' });

	// the head around its center
	if (o.hair === 'pony') {
		mk(head, 'path', { class: 'hm-hair', d: `M${f(-0.85 * r)} ${f(-0.45 * r)} Q${f(-1.75 * r)} ${f(-0.3 * r)} ${f(-1.6 * r)} ${f(0.9 * r)} Q${f(-1.35 * r)} ${f(0.45 * r)} ${f(-0.9 * r)} ${f(0.15 * r)} Z` });
		mk(head, 'circle', { class: 'hm-tie', cx: f(-1.0 * r), cy: f(-0.3 * r), r: f(0.15 * r) });
	}
	mk(head, 'circle', { class: 'hm-skin', r: f(r) });
	mk(head, 'path', { class: 'hm-skin', d: `M${f(0.9 * r)} ${f(-0.05 * r)} Q${f(1.3 * r)} ${f(0.22 * r)} ${f(0.92 * r)} ${f(0.38 * r)} Z` });
	mk(head, 'circle', { class: 'hm-cheek', cx: f(0.5 * r), cy: f(0.38 * r), r: f(0.22 * r) });
	mk(head, 'circle', { class: 'hm-eye', cx: f(0.56 * r), cy: f(0.02 * r), r: f(Math.max(0.8, 0.1 * r)) });
	mk(head, 'path', { class: 'hm-brow', d: `M${f(0.38 * r)} ${f(-0.22 * r)} L${f(0.78 * r)} ${f(-0.24 * r)}` });
	mk(head, 'path', { class: 'hm-mouth', d: `M${f(0.6 * r)} ${f(0.62 * r)} Q${f(0.75 * r)} ${f(0.68 * r)} ${f(0.85 * r)} ${f(0.58 * r)}` });
	// hair over the top and the back of the head
	mk(head, 'path', {
		class: 'hm-hair',
		d: `M${f(0.82 * r)} ${f(-0.5 * r)} Q${f(0.6 * r)} ${f(-1.18 * r)} ${f(-0.15 * r)} ${f(-1.08 * r)} Q${f(-1.15 * r)} ${f(-0.95 * r)} ${f(-1.04 * r)} ${f(0.1 * r)} Q${f(-0.95 * r)} ${f(0.55 * r)} ${f(-0.62 * r)} ${f(0.78 * r)} Q${f(-0.4 * r)} ${f(0.2 * r)} ${f(-0.3 * r)} ${f(-0.2 * r)} Q${f(0.25 * r)} ${f(-0.45 * r)} ${f(0.82 * r)} ${f(-0.5 * r)} Z`,
	});
	mk(head, 'ellipse', { class: 'hm-skin hm-ear', cx: f(-0.12 * r), cy: f(0.1 * r), rx: f(0.18 * r), ry: f(0.24 * r) });

	const shoe = (parent: SVGGElement) => {
		mk(parent, 'path', { class: 'hm-shoe', d: SHOE, 'vector-effect': 'non-scaling-stroke' });
		mk(parent, 'path', { class: 'hm-sole', d: SOLE });
		mk(parent, 'path', { class: 'hm-lace', d: LACE, 'vector-effect': 'non-scaling-stroke' });
	};
	shoe(nearFoot);
	shoe(farFoot);

	const X = (p: Pt): Pt => ({ x: dir * p.x, y: p.y });
	const leg = (path: Limb, shortsPath: Limb | null, foot: SVGGElement, hip: Pt, ankle: Pt, angle: number) => {
		const { j, end } = joint(hip, ankle, th, sh, 1);
		path.set(`M${P(hip)} L${P(j)} L${P(end)}`);
		if (shortsPath) shortsPath.set(`M${P(hip)} L${P({ x: hip.x + (j.x - hip.x) * 0.55, y: hip.y + (j.y - hip.y) * 0.55 })}`);
		foot.setAttribute('transform', `translate(${P(end)}) rotate(${f((angle * 180) / Math.PI)}) scale(${fScale})`);
	};
	const fScale = foot.toFixed(3);
	const fist = (c: Pt, R: number) => `M${f(c.x - R)} ${f(c.y)} a${f(R)} ${f(R)} 0 1 0 ${f(2 * R)} 0 a${f(R)} ${f(R)} 0 1 0 ${f(-2 * R)} 0 Z`;
	// a flat hand seen from its edge: the wrist at w, the fingers along the unit vector d
	const flat = (w: Pt, d: Pt) => {
		const t = 0.026 * u; // thickness
		const nx = -d.y;
		const ny = d.x;
		const a = { x: w.x + nx * t * 0.5, y: w.y + ny * t * 0.5 };
		const b = { x: w.x - nx * t * 0.5, y: w.y - ny * t * 0.5 };
		const tip = { x: w.x + d.x * handL, y: w.y + d.y * handL };
		const a2 = { x: a.x + d.x * handL * 0.85, y: a.y + d.y * handL * 0.85 };
		const b2 = { x: b.x + d.x * handL * 0.85, y: b.y + d.y * handL * 0.85 };
		// the thumb lies along the palm, a little apart
		const th0 = { x: w.x + d.x * handL * 0.2 - nx * t * 0.9, y: w.y + d.y * handL * 0.2 - ny * t * 0.9 };
		const th1 = { x: w.x + d.x * handL * 0.55 - nx * t * 0.8, y: w.y + d.y * handL * 0.55 - ny * t * 0.8 };
		return `M${P(a)} L${P(a2)} Q${P({ x: tip.x + nx * t * 0.5, y: tip.y + ny * t * 0.5 })} ${P(tip)} Q${P({ x: tip.x - nx * t * 0.5, y: tip.y - ny * t * 0.5 })} ${P(b2)} L${P(b)} Z M${P(b)} L${P(th0)} L${P(th1)} L${P({ x: b.x + d.x * handL * 0.5, y: b.y + d.y * handL * 0.5 })} Z`;
	};
	const arm = (path: Limb, hand: SVGPathElement, s0: Pt, target: Pt, palm: number | null | undefined) => {
		if (palm === null || palm === undefined) {
			const { j, end } = joint(s0, target, ua, fa, -1);
			path.set(`M${P(s0)} L${P(j)} L${P(end)}`);
			hand.setAttribute('d', fist(end, 0.034 * u));
			return;
		}
		// palm: the angle in the caller's frame; mirror it with the picture
		const d = { x: dir * Math.cos(palm), y: Math.sin(palm) };
		const wrist = { x: target.x - d.x * handL * 0.5, y: target.y - d.y * handL * 0.5 };
		const { j, end } = joint(s0, wrist, ua, fw, -1);
		path.set(`M${P(s0)} L${P(j)} L${P(end)}`);
		hand.setAttribute('d', flat(end, d));
	};

	return (p: HumanPose) => {
		const hip = X(p.hip);
		// in the frame of `root` the person always faces +x
		const ax = Math.sin(p.lean);
		const ay = -Math.cos(p.lean);
		// a point of the body: `a` along the spine from the hip joint, `b` across it (to the front)
		const at = (a: number, b: number): Pt => ({ x: hip.x + ax * a - ay * b, y: hip.y + ay * a + ax * b });
		const L = 0.3 * u; // hip joint to shoulder
		const pts = [at(-0.07 * u, -0.5 * W), at(0.12 * u, -0.5 * W), at(L - 0.02 * u, -0.46 * W), at(L + 0.03 * u, -0.22 * W), at(L + 0.03 * u, 0.2 * W), at(L - 0.03 * u, 0.46 * W), at(0.12 * u, 0.5 * W), at(-0.07 * u, 0.5 * W)];
		const [b0, b1, b2, b3, b4, b5, b6, b7] = pts;
		torso.setAttribute('d', `M${P(b0)} C${P(b1)} ${P(b1)} ${P(b2)} Q${P(at(L + 0.035 * u, -0.46 * W))} ${P(b3)} L${P(b4)} Q${P(at(L + 0.025 * u, 0.46 * W))} ${P(b5)} C${P(b6)} ${P(b6)} ${P(b7)} Z`);
		seam.setAttribute('d', o.bare ? `M${P(at(L + 0.02 * u, -0.05 * W))} Q${P(at(L - 0.06 * u, 0.12 * W))} ${P(at(L + 0.02 * u, 0.24 * W))}` : `M${P(at(-0.04 * u, -0.48 * W))} L${P(at(-0.04 * u, 0.48 * W))}`);
		const hc = at(L + 0.1 * u, 0.1 * W);
		const n0 = at(L - 0.01 * u, 0.02 * W);
		const nw = 0.026 * u;
		neck.setAttribute('d', `M${P({ x: n0.x - nw, y: n0.y })} L${P({ x: hc.x - nw * 0.8, y: hc.y })} L${P({ x: hc.x + nw * 0.8, y: hc.y })} L${P({ x: n0.x + nw, y: n0.y })} Z`);
		const tilt = ((p.lean * 0.4 + (p.head ?? 0)) * 180) / Math.PI;
		head.setAttribute('transform', `translate(${P(hc)}) rotate(${f(tilt)})`);
		leg(farLeg, farShort, farFoot, at(0, -0.04 * W), X(p.ankles[1]), p.feet[1]);
		leg(nearLeg, nearShort, nearFoot, at(0, 0.04 * W), X(p.ankles[0]), p.feet[0]);
		arm(farArm, farHand, at(L - 0.03 * u, 0.06 * W), X(p.hands[1]), p.palms?.[1]);
		arm(nearArm, nearHand, at(L - 0.03 * u, -0.02 * W), X(p.hands[0]), p.palms?.[0]);
	};
};

/**
 * Walking: the positions of two feet when the body has moved by `d` px, with steps of `step` px. Each foot stands
 * for one step of the body and swings forward by two steps during the next one (lifted by `lift` px at most).
 * `base` is where the near foot stands at d = 0; the far one starts half a cycle later.
 */
export type Foot = { x: number; up: number; swing: number; from: number; to: number; e: number };
export const gait = (d: number, step: number, base: number, lift: number): [Foot, Foot] => {
	const one = (i: number): Foot => {
		const q = d / step + i;
		const n = Math.floor(q / 2);
		const ph = q - 2 * n;
		const sw = ph < 1 ? 0 : ph - 1;
		const e = sw * sw * (3 - 2 * sw);
		const from = base - i * step + 2 * step * n;
		return { x: from + 2 * step * e, up: lift * Math.sin(Math.PI * sw), swing: sw, from, to: from + 2 * step, e };
	};
	return [one(0), one(1)];
};
