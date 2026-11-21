/**
 * The people kit, the figure: a person in profile (facing right; `dir: -1` mirrors it to face left) with a body, a head,
 * clothes, two arms and two legs bent by two-bone inverse kinematics within the joint limits, and two hands from hand.ts.
 *
 * Proportions: SKELETON in core.ts (adult about 7½ heads, teen about 7, child about 6). Limb widths in parts of the
 * height: upper arm / forearm near 0,062, far 0,058; leg near 0,08–0,084, far 0,074–0,078 (as the old helpers); the
 * far arm and leg are drawn first, in a group darkened by the stylesheet.
 *
 * Clothes, each with the class prefix the old helper used (so the pictures that style those classes keep working):
 *   indoor (hm-): hair, a shirt or a sleeveless singlet, trousers or shorts, trainers 26 см long;
 *   home (ph-, kit: pkh-): a shirt with short sleeves, a belt, trousers, low shoes 27 см long;
 *   winter (pp-, kit: pkw-): a jacket, a hat with a pompom, a scarf, mittens or gloves, boots and the gear (boot, ski,
 *     snowshoe, skate; poles);
 *   swim (sw-, kit: pks-): bare skin, swim trunks, bare feet 25 см long.
 *
 * A pose (FigurePose) gives the hip joint, the lean of the body, both ankles with the angles of the feet and both hands:
 * a hand is a target point (the point of the hand pose that touches or holds, see contactLocal in hand.ts) with a pose,
 * a grip diameter, the direction of the fingers and the roll of the palm; a hand without a direction keeps the wrist
 * straight. A target out of reach is approached as close as the bones allow: the bones never stretch, and the debug
 * hook reports the miss. Hand targets, ankles and planted feet are published with `?people-debug` (debug.ts).
 */
import { DEG, ELBOW, KNEE, LIMITS, P1, SKELETON, angleOf, clamp, dist, f1, fk, ik, mk, nextId, sub, wrap, type Age, type Pt } from './core';
import { contactLocal, hand, handPoint, handShape, wristFor, type Covering, type Hand, type HandPose, type HandShape, type V3 } from './hand';
import { publish } from './debug';

export type Clothes = 'indoor' | 'home' | 'winter' | 'swim';
export type Gear = 'boot' | 'ski' | 'shoe' | 'skate';

export interface FigureOpts {
	s: number; // px per centimeter
	H: number; // height, см
	age?: Age;
	girth?: number; // 1 = average build
	clothes?: Clothes;
	prefix?: string; // class prefix (default: hm, pkh, pkw, pks by the clothes)
	shirt?: string; // class of the shirt, jacket or trunks color
	hair?: 'short' | 'pony';
	bare?: boolean; // indoor: a sleeveless singlet
	shorts?: boolean; // indoor
	gear?: Gear; // winter footwear
	poles?: boolean; // winter: ski poles
	covering?: Covering; // hands: skin, mitten or glove (winter: mitten)
	dir?: 1 | -1; // 1 faces right, −1 faces left (the caller passes real coordinates)
	name?: string; // a name for the debug data
	/** @internal the old helpers: their exact layering and widths, no root group (except indoor), wrist not clamped */
	legacy?: boolean;
}

export interface HandTarget {
	at?: Pt; // where the contact point of the hand pose goes (or pose the arm by `arm`)
	arm?: [number, number]; // by angles: the screen angle of the upper arm (rad, caller's frame) and the elbow bend (0…150°)
	pose?: HandPose; // default: grip (relaxed when the arm hangs)
	d?: number; // grip diameter, см (default 3)
	dir?: number; // rad, screen direction of the fingers (default: straight on from the forearm)
	roll?: number; // rad, see hand.ts (default: the back of the hand a little toward the viewer)
	shape?: HandShape; // a ready shape (a blend), overrides `pose` for the fingers
	contact?: string; // name of the object point the hand holds or touches (for the checker)
}
export interface FigurePose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	legs?: [[number, number] | null, [number, number] | null]; // by angles instead of the ankle: thigh angle (rad, caller's frame), knee bend
	hands: [HandTarget | Pt, HandTarget | Pt]; // near, far
	head?: number; // rad, the head turns down
	planted?: [boolean, boolean]; // a foot that stands on the ground (must not slide)
	poleTips?: [Pt, Pt];
	knees?: 1 | -1; // 1 = the knees bend forward (default)
}
/** Where the hands ended up: the grip frame of each hand in the caller's coordinates (for attach() in motion.ts). */
export interface GripFrame {
	x: number;
	y: number;
	angle: number; // rad, screen direction of the fingers
	axis: Pt; // the held cylinder's axis on screen (unit; zero when it points at the viewer)
	flip: boolean; // the person faces left
}
export interface FigureState {
	grips: [GripFrame, GripFrame];
	shoulders: [Pt, Pt];
	elbows: [Pt, Pt];
	wrists: [Pt, Pt];
	knees: [Pt, Pt];
}

// footwear outlines in centimeters, the ankle at (0, 0), the toe to the right
const TRAINER = 'M-6 -5 L4.5 -5 Q5.5 -1.5 9 -0.5 L16.5 1.2 Q20 2.3 20 4.6 L20 7 L-7.5 7 L-7.5 1 Q-7.5 -3.2 -6 -5 Z';
const TRAINER_SOLE = 'M-7.5 5 H20 V7 H-7.5 Z';
const TRAINER_LACE = 'M3 -3.4 L6.5 -1 M5.5 -1.8 L9 0.3';
const LOWSHOE = 'M-5.5 -4 Q-1 -6 4 -4.5 Q8 -1.5 13 0 L18 1.5 Q21 2.5 21 5 L21 7.5 L-6.5 7.5 L-6.5 1 Q-7 -2.5 -5.5 -4 Z';
const LOWSHOE_SOLE = 'M-6.5 5.8 H21 V7.5 H-6.5 Z';
const BOOT = 'M-6.5 -11 L5.5 -11 Q6.5 -4 9.5 -1.5 L17 1.5 Q21.5 3 21.5 6 L21.5 8 L-8 8 L-8 1 Q-8.5 -6 -6.5 -11 Z';
const BOOT_SOLE = 'M-8 5.6 H21.5 V8 H-8 Z';
const CUFF = 'M-7.2 -11 H6.2 V-7.6 H-7.6 Z';
const SKI = 'M-84 8.2 H82 Q94 8.2 100 0.6 L101.6 1.8 Q95.5 10.6 82 10.6 H-84 Q-86 10.6 -86 9.4 Q-86 8.2 -84 8.2 Z';
const BIND = 'M-9 6.2 H23 V8.4 H-9 Z';
const BLADE = 'M-9.5 13.2 H22 Q27 13.2 27.5 10.5 L29 11 Q28.6 15.6 22 15.6 H-9.5 Z';
const HOLDER = 'M-6.5 8 L-5.5 13.4 L-1.5 13.4 L-0.5 8 Z M12.5 8 L13.5 13.4 L18 13.4 L19 8 Z';
const BAREFOOT = 'M-4.5 -4.5 Q-7 0 -6.5 4 Q-6.3 7 -3 7 L15.5 7 Q20 7 20 4.6 Q20 2.4 16 1.6 L6.5 -0.8 Q3.6 -2.2 3.2 -5.2 Z';
const TOES = 'M15.5 3 Q17.2 3.4 18.2 4.6 M12.6 3 Q13.6 3.6 14.2 4.8';

/** Height of the ankle above the ground, см, by footwear. */
export const ANKLE_CM = { trainer: 7, lowshoe: 7.5, barefoot: 7, boot: 8, ski: 10.5, shoe: 9.5, skate: 15.5 };

const isTarget = (h: HandTarget | Pt): h is HandTarget => (h as HandTarget).at !== undefined || (h as HandTarget).arm !== undefined;

/** Builds a person into `g` and returns `pose(p)`, which draws it and returns where its joints and grips are. */
export const figure = (g: SVGGElement, o: FigureOpts) => {
	g.replaceChildren();
	const clothes = o.clothes ?? 'indoor';
	const legacy = !!o.legacy;
	const p = o.prefix ?? { indoor: 'hm', home: 'pkh', winter: 'pkw', swim: 'pks' }[clothes];
	const c = (n: string) => `${p}-${n}`;
	const sk = SKELETON[o.age ?? 'adult'];
	const dir = o.dir ?? 1;
	const girth = o.girth ?? 1;
	const u = o.s * o.H; // px per body height
	const th = sk.thigh * u;
	const sh = sk.shin * u;
	const ua = sk.upper * u;
	const fa = sk.fore * u;
	const Lh = sk.hand * u;
	const gw = Math.pow(girth, 0.8);
	const W = { indoor: 0.15, home: 0.16, winter: 0.17, swim: 0.17 }[clothes] * u * girth * (sk.depth / 0.15);
	const r = sk.headR * u;
	const L = (sk.shoulder + 0.03) * u; // hip joint to the top of the shoulders
	const HC = sk.headC * u; // hip joint to the head center
	const belly = W * (0.5 + 0.18 * Math.max(0, girth - 1));
	const strict = !legacy;
	const covering: Covering = o.covering ?? (clothes === 'winter' ? 'mitten' : 'skin');
	const handCls = covering === 'mitten' ? c('mitten') : covering === 'glove' ? c('glove') : c('skin');
	const ow = clothes === 'winter' || clothes === 'swim' ? 1.6 : 1.4; // outline width added to a limb

	const id = nextId(o.name ?? 'person');
	g.setAttribute('data-person', id);
	// the old indoor helper mirrored a root group; the others drew straight into g (callers look for direct children)
	const root = clothes === 'indoor' || !legacy ? mk(g, 'g', dir < 0 ? { transform: 'scale(-1 1)' } : {}) : g;
	type Limb = { set: (d: string) => void };
	const limb = (parent: Element, cls: string, w: number): Limb => {
		const a = mk(parent, 'path', { class: c('outline'), 'stroke-width': f1(w + ow) });
		const b = mk(parent, 'path', { class: cls, 'stroke-width': f1(w) });
		return { set: (d) => (a.setAttribute('d', d), b.setAttribute('d', d)) };
	};

	// ---- the arm: drawn as the clothes require, then the hand
	type Arm = { draw: (s0: Pt, j: Pt, w: Pt) => void; hand: Hand };
	const makeArm = (parent: Element, near: boolean): Arm => {
		const w = (near ? 0.062 : 0.058) * u * gw;
		const side = near ? 'R' : 'L'; // a right-facing person shows the right side
		if (clothes === 'home') {
			const skin = limb(parent, c('skin-limb'), w * 0.82);
			const sleeve = limb(parent, `${c('sleeve')} ${o.shirt ?? ''}`, w * 1.12);
			const hd = hand(parent, { cls: handCls, side, Lh, covering });
			return {
				hand: hd,
				draw: (s0, j, e) => {
					skin.set(`M${P1(s0)} L${P1(j)} L${P1(e)}`);
					const k = 0.55; // the sleeve covers a little more than half of the upper arm
					sleeve.set(`M${P1(s0)} L${P1({ x: s0.x + (j.x - s0.x) * k, y: s0.y + (j.y - s0.y) * k })}`);
				},
			};
		}
		const cls = clothes === 'winter' ? `${c('sleeve')} ${o.shirt ?? ''}` : clothes === 'swim' ? c('limb') : o.bare ? c('limb-skin') : `${c('limb')} ${o.shirt ?? ''}`;
		const width = clothes === 'winter' ? (near ? 0.066 : 0.062) * u * gw : clothes === 'swim' ? (near ? 1 : 0.95) * 0.062 * u * gw : w;
		const lb = limb(parent, cls, width);
		const hd = hand(parent, { cls: handCls, side, Lh, covering });
		return { hand: hd, draw: (s0, j, e) => lb.set(`M${P1(s0)} L${P1(j)} L${P1(e)}`) };
	};

	// ---- the leg with its footwear
	type Leg = { draw: (hip: Pt, j: Pt, end: Pt, angle: number) => void };
	const makeLeg = (parent: Element, near: boolean): { leg: Leg; foot: SVGGElement; extra?: SVGPathElement } => {
		const base = clothes === 'winter' || clothes === 'home' ? (near ? 0.084 : 0.078) : clothes === 'swim' ? 0.084 * (near ? 1 : 0.93) : near ? 0.08 : 0.074;
		const w = base * u * gw;
		const cls = clothes === 'swim' || (clothes === 'indoor' && o.shorts) ? c(clothes === 'swim' ? 'limb' : 'limb-skin') : clothes === 'indoor' ? `${c('limb')} ${c('pants')}` : c('pants');
		const lb = limb(parent, cls, w);
		const short = clothes === 'indoor' && o.shorts ? limb(parent, `${c('limb')} ${c('pants')}`, (near ? 0.092 : 0.086) * u * gw) : null;
		const trunk = clothes === 'swim' && !near ? mk(parent, 'path', { class: `${c('trunk')} ${o.shirt ?? ''}`, 'stroke-width': f1(near ? w : w + 1.6) }) : null;
		const foot = mk(parent, 'g', {});
		const fs = clothes === 'indoor' ? o.s * Math.min(1, o.H / 172) : o.s;
		return {
			foot,
			extra: trunk ?? undefined,
			leg: {
				draw: (hip, j, end, angle) => {
					lb.set(`M${P1(hip)} L${P1(j)} L${P1(end)}`);
					if (short) short.set(`M${P1(hip)} L${P1({ x: hip.x + (j.x - hip.x) * 0.55, y: hip.y + (j.y - hip.y) * 0.55 })}`);
					if (trunk) trunk.setAttribute('d', `M${P1(hip)} L${P1({ x: hip.x + (j.x - hip.x) * 0.3, y: hip.y + (j.y - hip.y) * 0.3 })}`);
					foot.setAttribute('transform', `translate(${P1(end)}) rotate(${f1(angle / DEG)}) scale(${fs.toFixed(3)})`);
				},
			},
		};
	};
	const dressFoot = (parent: SVGGElement, near: boolean) => {
		if (clothes === 'indoor') {
			mk(parent, 'path', { class: c('shoe'), d: TRAINER, 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: c('sole'), d: TRAINER_SOLE });
			mk(parent, 'path', { class: c('lace'), d: TRAINER_LACE, 'vector-effect': 'non-scaling-stroke' });
		} else if (clothes === 'home') {
			mk(parent, 'path', { class: c('shoe'), d: LOWSHOE, 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: c('sole'), d: LOWSHOE_SOLE });
		} else if (clothes === 'swim') {
			mk(parent, 'path', { class: `${c('skin')} ${c('foot')}`, d: BAREFOOT, 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: c('toes'), d: TOES, 'vector-effect': 'non-scaling-stroke' });
		} else {
			const gear = o.gear ?? 'boot';
			const fc = near ? '' : ` ${c('far-gear')}`;
			if (gear === 'ski') {
				mk(parent, 'path', { class: `${c('ski')}${fc}`, d: SKI, 'vector-effect': 'non-scaling-stroke' });
				mk(parent, 'path', { class: c('bind'), d: BIND });
			}
			if (gear === 'shoe') {
				const [cx, cy, rx, ry] = [6, 9.5, 30, 6.5];
				mk(parent, 'ellipse', { class: c('shoe'), cx, cy, rx, ry, 'vector-effect': 'non-scaling-stroke' });
				let d = '';
				for (let x = -24; x <= 30; x += 6) {
					const h = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
					d += `M${x} ${f1(cy - h)} V${f1(cy + h)} `;
				}
				d += `M${cx - rx + 3} ${cy} H${cx + rx - 3}`;
				mk(parent, 'path', { class: c('lattice'), d, 'vector-effect': 'non-scaling-stroke' });
			}
			mk(parent, 'path', { class: c('boot'), d: BOOT, 'vector-effect': 'non-scaling-stroke' });
			mk(parent, 'path', { class: c('sole'), d: BOOT_SOLE });
			mk(parent, 'path', { class: c('cuff'), d: CUFF });
			if (gear === 'shoe') {
				mk(parent, 'path', { class: c('shoe-rim'), d: 'M-24 9.5 A30 6.5 0 0 0 36 9.5', 'vector-effect': 'non-scaling-stroke' });
				mk(parent, 'path', { class: c('strap'), d: 'M4 -2 L12 1.5 L12 4 L3 0.5 Z M-6.5 -4 L-1 -4 L-1 -1.5 L-7 -1.5 Z' });
			}
			if (gear === 'skate') {
				mk(parent, 'path', { class: c('holder'), d: HOLDER });
				mk(parent, 'path', { class: c('blade'), d: BLADE, 'vector-effect': 'non-scaling-stroke' });
				mk(parent, 'path', { class: c('lace'), d: 'M-2 -9 L4 -9 M-1 -6 L5 -6 M0 -3 L7 -3', 'vector-effect': 'non-scaling-stroke' });
			}
		}
	};

	// ---- layers, back to front (the order of the old helpers)
	const far = mk(root, 'g', { class: c('far') });
	const farPole = clothes === 'winter' && o.poles ? mk(far, 'path', { class: c('pole') }) : null;
	const farArm = makeArm(far, false);
	const farL = makeLeg(far, false);
	dressFoot(farL.foot, false);
	const near = mk(root, 'g', {});
	const nearL = makeLeg(near, true);
	dressFoot(nearL.foot, true);
	const holder = clothes === 'winter' ? mk(root, 'g', {}) : root; // the old winter person grouped torso and head
	const neck = clothes === 'winter' ? null : clothes === 'swim' ? limb(root, c('limb'), 0.05 * u * gw) : mk(root, 'path', { class: c('skin') });
	const torso = mk(holder, 'path', { class: clothes === 'swim' ? c('skin') : `${c(clothes === 'winter' ? 'coat' : 'shirt')} ${o.shirt ?? ''}` });
	const t1 = mk(holder, 'path', { class: c({ indoor: 'seam', home: 'belt', winter: 'zip', swim: 'suit' }[clothes]) + (clothes === 'swim' ? ` ${o.shirt ?? ''}` : '') });
	const t2 = clothes === 'home' ? mk(holder, 'path', { class: c('collar') }) : null;
	const nearTrunk = clothes === 'swim' ? mk(root, 'path', { class: `${c('trunk')} ${o.shirt ?? ''}`, 'stroke-width': f1(0.084 * u * gw) }) : null;
	const navel = clothes === 'swim' ? mk(root, 'circle', { class: c('dot'), r: f1(Math.max(0.5, 0.006 * u)) }) : null;
	const head = mk(holder, 'g', {});
	const scarf = clothes === 'winter' ? mk(root, 'path', { class: c('scarf') }) : null;
	const nearPole = clothes === 'winter' && o.poles ? mk(root, 'path', { class: c('pole') }) : null;
	const nearArm = makeArm(root, true);

	// ---- the head around its center (the face to +x)
	const R = (k: number) => f1(k * r);
	const face = (brow: string | null) => {
		mk(head, 'path', { class: c('skin'), d: `M${R(0.9)} ${R(-0.05)} Q${R(1.3)} ${R(0.22)} ${R(0.92)} ${R(0.38)} Z` });
		mk(head, 'circle', { class: c('cheek'), cx: R(0.5), cy: R(0.38), r: R(0.22) });
		mk(head, 'circle', { class: c('eye'), cx: R(0.56), cy: R(0.02), r: f1(Math.max(0.8, 0.1 * r)) });
		if (brow) mk(head, 'path', { class: c('brow'), d: brow });
		mk(head, 'path', { class: c('mouth'), d: `M${R(0.6)} ${R(0.62)} Q${R(0.75)} ${R(0.68)} ${R(0.85)} ${R(0.58)}` });
	};
	const ear = () => mk(head, 'ellipse', { class: `${c('skin')} ${c('ear')}`, cx: R(-0.12), cy: R(0.1), rx: R(0.18), ry: R(0.24) });
	if (clothes === 'indoor') {
		if (o.hair === 'pony') {
			mk(head, 'path', { class: c('hair'), d: `M${R(-0.85)} ${R(-0.45)} Q${R(-1.75)} ${R(-0.3)} ${R(-1.6)} ${R(0.9)} Q${R(-1.35)} ${R(0.45)} ${R(-0.9)} ${R(0.15)} Z` });
			mk(head, 'circle', { class: c('tie'), cx: R(-1.0), cy: R(-0.3), r: R(0.15) });
		}
		mk(head, 'circle', { class: c('skin'), r: f1(r) });
		face(`M${R(0.38)} ${R(-0.22)} L${R(0.78)} ${R(-0.24)}`);
		mk(head, 'path', {
			class: c('hair'),
			d: `M${R(0.82)} ${R(-0.5)} Q${R(0.6)} ${R(-1.18)} ${R(-0.15)} ${R(-1.08)} Q${R(-1.15)} ${R(-0.95)} ${R(-1.04)} ${R(0.1)} Q${R(-0.95)} ${R(0.55)} ${R(-0.62)} ${R(0.78)} Q${R(-0.4)} ${R(0.2)} ${R(-0.3)} ${R(-0.2)} Q${R(0.25)} ${R(-0.45)} ${R(0.82)} ${R(-0.5)} Z`,
		});
		ear();
	} else if (clothes === 'home') {
		mk(head, 'circle', { class: c('skin'), r: f1(r) });
		mk(head, 'path', { class: c('skin'), d: `M${R(0.9)} ${R(-0.05)} Q${R(1.32)} ${R(0.22)} ${R(0.92)} ${R(0.38)} Z` });
		mk(head, 'path', {
			class: c('hair'),
			d: `M${R(-1.04)} ${R(0.42)} Q${R(-1.25)} ${R(-0.9)} ${R(-0.1)} ${R(-1.1)} Q${R(0.85)} ${R(-1.12)} ${R(1.0)} ${R(-0.42)} Q${R(0.55)} ${R(-0.66)} ${R(0.1)} ${R(-0.5)} Q${R(-0.25)} ${R(-0.2)} ${R(-0.42)} ${R(0.42)} Z`,
		});
		mk(head, 'circle', { class: c('cheek'), cx: R(0.5), cy: R(0.38), r: R(0.22) });
		mk(head, 'circle', { class: c('eye'), cx: R(0.56), cy: R(0.02), r: f1(Math.max(0.8, 0.1 * r)) });
		mk(head, 'path', { class: c('brow'), d: `M${R(0.4)} ${R(-0.2)} L${R(0.75)} ${R(-0.22)}` });
		mk(head, 'path', { class: c('mouth'), d: `M${R(0.6)} ${R(0.62)} Q${R(0.75)} ${R(0.68)} ${R(0.85)} ${R(0.58)}` });
		ear();
	} else if (clothes === 'winter') {
		mk(head, 'path', { class: c('hair'), d: `M${R(-0.98)} ${R(-0.2)} Q${R(-1.12)} ${R(0.55)} ${R(-0.55)} ${R(0.78)} L${R(-0.2)} ${R(0.1)} Z` });
		mk(head, 'circle', { class: c('skin'), r: f1(r) });
		face(null);
		ear();
		mk(head, 'path', { class: c('hat'), d: `M${R(-1.1)} ${R(-0.05)} Q${R(-1.2)} ${R(-1.25)} ${R(0.05)} ${R(-1.22)} Q${R(1.05)} ${R(-1.1)} ${R(1.04)} ${R(-0.32)} Z` });
		mk(head, 'path', { class: c('hat-band'), d: `M${R(-1.14)} ${R(0.02)} L${R(1.08)} ${R(-0.3)} L${R(1.02)} ${R(-0.62)} L${R(-1.12)} ${R(-0.36)} Z` });
		mk(head, 'circle', { class: c('pompom'), cx: R(-0.45), cy: R(-1.32), r: R(0.32) });
	} else {
		mk(head, 'path', { class: c('hair'), d: `M${R(-1.02)} ${R(0.3)} Q${R(-1.15)} ${R(0.75)} ${R(-0.6)} ${R(0.8)} L${R(-0.3)} ${R(0.1)} Z` });
		mk(head, 'circle', { class: c('skin'), r: f1(r) });
		face(`M${R(0.4)} ${R(-0.22)} Q${R(0.58)} ${R(-0.32)} ${R(0.76)} ${R(-0.22)}`);
		ear();
		mk(head, 'path', {
			class: c('hair'),
			d: `M${R(-1.04)} ${R(0.28)} Q${R(-1.22)} ${R(-0.9)} ${R(-0.1)} ${R(-1.1)} Q${R(0.85)} ${R(-1.18)} ${R(1.0)} ${R(-0.42)} Q${R(0.7)} ${R(-0.7)} ${R(0.3)} ${R(-0.55)} Q${R(-0.2)} ${R(-0.45)} ${R(-0.42)} ${R(-0.05)} L${R(-0.6)} ${R(0.35)} Z`,
		});
	}

	// ---- posing
	const X = (q: Pt): Pt => ({ x: dir * q.x, y: q.y }); // caller ↔ root coordinates (an involution)
	const Xa = (a: number) => (dir > 0 ? a : Math.PI - a);
	const reach = ua + fa;
	const defaultD = 3; // см
	const hangs = (s0: Pt, w: Pt) => w.y - s0.y > 0.7 * reach && Math.abs(w.x - s0.x) < 0.45 * (w.y - s0.y);

	type ArmOut = { s0: Pt; j: Pt; w: Pt; bend: number; wristAngle: number; target: Pt; got: Pt; frame: GripFrame; pose: HandPose; contact?: string };
	const placeArm = (arm: Arm, s0: Pt, spec: HandTarget | Pt, side: 'L' | 'R'): ArmOut => {
		const t: HandTarget = isTarget(spec) ? spec : { at: spec };
		const byAngles = t.arm ? fk(s0, Xa(t.arm[0]), clamp(t.arm[1], LIMITS.elbow[0], LIMITS.elbow[1]), ua, fa, ELBOW) : null;
		const target = byAngles ? byAngles.end : X(t.at!);
		const pose: HandPose = t.pose ?? (hangs(s0, target) ? 'relaxed' : 'grip');
		const dLh = (t.d ?? defaultD) * o.s / Lh;
		const shape = t.shape ?? handShape(pose, dLh);
		const cl: V3 = contactLocal(pose, shape, dLh);
		const fixedDir = t.dir !== undefined ? Xa(t.dir) : null;
		let hdir = fixedDir ?? angleOf(sub(target, s0));
		const rollOf = (hd: number) => {
			if (t.roll !== undefined) return t.roll;
			if (pose === 'flat') return -0.3;
			const down = Math.abs(wrap(hd - Math.PI / 2)) < 40 * DEG;
			return down ? -1.25 : -0.5;
		};
		let res = byAngles ? { ...byAngles, bend: clamp(t.arm![1], 0, LIMITS.elbow[1]) } : ik(s0, target, ua, fa, ELBOW);
		if (byAngles) {
			const fore = angleOf(sub(res.end, res.j));
			hdir = fixedDir ?? fore + (pose === 'relaxed' ? 12 * DEG * Math.sign(Math.cos(t.roll ?? -0.5) || 1) : 0);
		}
		for (let it = 0; it < (byAngles ? 0 : 6); it++) {
			const w = wristFor(side, target, hdir, rollOf(hdir), Lh, cl);
			res = ik(s0, w, ua, fa, ELBOW);
			const fore = angleOf(sub(res.end, res.j));
			if (fixedDir === null) {
				const roll = rollOf(hdir);
				const flex = pose === 'relaxed' ? 12 * DEG * Math.sign(Math.cos(roll) || 1) : 0;
				hdir = fore + flex;
			} else if (strict) {
				// keep the wrist within its limits
				const lim = Math.abs(Math.cos(rollOf(hdir))) > 0.5 ? LIMITS.wristBend : LIMITS.wristSide + 10 * DEG;
				hdir = fore + clamp(wrap(fixedDir - fore), -lim, lim);
			}
		}
		if (!byAngles) {
			res = ik(s0, wristFor(side, target, hdir, rollOf(hdir), Lh, cl), ua, fa, ELBOW);
			// the joint limit wins over the contact: the hand turns about the wrist back into its range
			const fore = angleOf(sub(res.end, res.j));
			const lim = Math.abs(Math.cos(rollOf(hdir))) > 0.5 ? LIMITS.wristBend : LIMITS.wristSide + 10 * DEG;
			if (strict) hdir = fore + clamp(wrap(hdir - fore), -lim, lim);
		}
		const roll = rollOf(hdir);
		const fr = { wrist: res.end, dir: hdir, roll };
		arm.hand.set(fr, shape, pose, cl);
		const got = handPoint(side, fr, Lh, cl);
		const ax = handPoint(side, fr, Lh, [cl[0], cl[1], cl[2] + 1]);
		const axis = sub(ax, got);
		const al = Math.hypot(axis.x, axis.y) / Lh;
		const gf: GripFrame = { ...X(got), angle: Xa(hdir), axis: al > 0.05 ? { x: (dir * axis.x) / (al * Lh), y: axis.y / (al * Lh) } : { x: 0, y: 0 }, flip: dir < 0 };
		arm.hand.debug.contact = X(got);
		return { s0, j: res.j, w: res.end, bend: res.bend, wristAngle: wrap(hdir - angleOf(sub(res.end, res.j))), target: t.at ?? X(got), got: X(got), frame: gf, pose, contact: t.contact };
	};

	let frameNo = 0;
	publish(id, () => ({ kind: clothes, name: o.name ?? '', legacy, frame: 0 })); // built, not posed yet
	const pose = (q: FigurePose): FigureState => {
		const hip = X(q.hip);
		const ax = Math.sin(q.lean);
		const ay = -Math.cos(q.lean);
		// a point of the body: `a` along the spine from the hip joint, `b` across it (to the front)
		const at = (a: number, b: number): Pt => ({ x: hip.x + ax * a - ay * b, y: hip.y + ay * a + ax * b });
		// torso and its details
		if (clothes === 'indoor') {
			const pts = [at(-0.07 * u, -0.5 * W), at(0.12 * u, -0.5 * W), at(L - 0.02 * u, -0.46 * W), at(L + 0.03 * u, -0.22 * W), at(L + 0.03 * u, 0.2 * W), at(L - 0.03 * u, 0.46 * W), at(0.12 * u, 0.5 * W), at(-0.07 * u, 0.5 * W)];
			const [b0, b1, b2, b3, b4, b5, b6, b7] = pts;
			torso.setAttribute('d', `M${P1(b0)} C${P1(b1)} ${P1(b1)} ${P1(b2)} Q${P1(at(L + 0.035 * u, -0.46 * W))} ${P1(b3)} L${P1(b4)} Q${P1(at(L + 0.025 * u, 0.46 * W))} ${P1(b5)} C${P1(b6)} ${P1(b6)} ${P1(b7)} Z`);
			t1.setAttribute('d', o.bare ? `M${P1(at(L + 0.02 * u, -0.05 * W))} Q${P1(at(L - 0.06 * u, 0.12 * W))} ${P1(at(L + 0.02 * u, 0.24 * W))}` : `M${P1(at(-0.04 * u, -0.48 * W))} L${P1(at(-0.04 * u, 0.48 * W))}`);
		} else {
			const top = clothes === 'home' ? 0.03 : 0.035;
			const front = clothes === 'home' ? 0.2 : 0.22;
			const backTop = clothes === 'home' ? -0.18 : -0.2;
			const low = clothes === 'home' ? 0.06 : 0.07;
			const b5w = clothes === 'swim' ? 0.5 : clothes === 'winter' ? 0.48 : 0.46;
			const b1w = clothes === 'winter' ? -0.52 : -0.5;
			const q1 = clothes === 'home' ? [0.035, 0.025] : [0.04, 0.03];
			const b0 = at(-low * u, -0.5 * W);
			const b1 = at(0.12 * u, b1w * W);
			const b2 = at(L - 0.02 * u, -0.46 * W);
			const b3 = at(L + top * u, backTop * W);
			const b4 = at(L + top * u, front * W);
			const b5 = at(L - 0.03 * u, b5w * W);
			const b6 = at(0.12 * u, belly);
			const b7 = at(-low * u, 0.5 * W);
			torso.setAttribute('d', `M${P1(b0)} C${P1(b1)} ${P1(b1)} ${P1(b2)} Q${P1(at(L + q1[0] * u, -0.46 * W))} ${P1(b3)} L${P1(b4)} Q${P1(at(L + q1[1] * u, b5w * W))} ${P1(b5)} C${P1(b6)} ${P1(b6)} ${P1(b7)} Z`);
			if (clothes === 'home') {
				t1.setAttribute('d', `M${P1(at(-0.035 * u, -0.5 * W))} L${P1(at(-0.035 * u, 0.5 * W))} L${P1(at(-0.06 * u, 0.5 * W))} L${P1(at(-0.06 * u, -0.5 * W))} Z`);
				t2!.setAttribute('d', `M${P1(at(L + 0.03 * u, -0.12 * W))} L${P1(at(L - 0.02 * u, 0.06 * W))} L${P1(at(L + 0.03 * u, 0.2 * W))}`);
			} else if (clothes === 'winter') {
				t1.setAttribute('d', `M${P1(at(L - 0.01 * u, 0.36 * W))} C${P1(at(0.12 * u, belly - 0.08 * W))} ${P1(at(0.12 * u, belly - 0.08 * W))} ${P1(at(-0.06 * u, 0.4 * W))}`);
				scarf!.setAttribute('d', `M${P1(at(L + 0.045 * u, -0.28 * W))} L${P1(at(L + 0.05 * u, 0.3 * W))} L${P1(at(L - 0.02 * u, 0.32 * W))} L${P1(at(L - 0.03 * u, -0.3 * W))} Z M${P1(at(L, 0.2 * W))} L${P1(at(L - 0.13 * u, 0.36 * W))} L${P1(at(L - 0.12 * u, 0.12 * W))} L${P1(at(L - 0.01 * u, 0.0))} Z`);
			} else {
				t1.setAttribute('d', `M${P1(at(-0.06 * u, -0.5 * W))} L${P1(at(0.06 * u, -0.52 * W))} Q${P1(at(0.07 * u, 0))} ${P1(at(0.06 * u, belly * 0.98))} L${P1(at(-0.04 * u, 0.48 * W))} Q${P1(at(-0.08 * u, 0))} ${P1(at(-0.06 * u, -0.5 * W))} Z`);
				const nv = at(0.12 * u, belly - 0.1 * W);
				navel!.setAttribute('cx', f1(nv.x));
				navel!.setAttribute('cy', f1(nv.y));
			}
		}
		// neck and head
		const hcOff = clothes === 'winter' || clothes === 'swim' ? [HC + 0.005 * u, 0.12 * W] : [HC, 0.1 * W];
		const hc = at(hcOff[0], hcOff[1]);
		if (clothes === 'indoor') {
			const n0 = at(L - 0.01 * u, 0.02 * W);
			const nw = 0.026 * u;
			(neck as SVGPathElement).setAttribute('d', `M${P1({ x: n0.x - nw, y: n0.y })} L${P1({ x: hc.x - nw * 0.8, y: hc.y })} L${P1({ x: hc.x + nw * 0.8, y: hc.y })} L${P1({ x: n0.x + nw, y: n0.y })} Z`);
		} else if (clothes === 'home') {
			(neck as SVGPathElement).setAttribute('d', `M${P1(at(L, -0.16 * W))} L${P1(at(L + 0.07 * u, -0.12 * W))} L${P1(at(L + 0.07 * u, 0.2 * W))} L${P1(at(L, 0.2 * W))} Z`);
		} else if (clothes === 'swim') {
			(neck as Limb).set(`M${P1(at(L - 0.02 * u, 0.06 * W))} L${P1(at(L + 0.06 * u, 0.1 * W))}`);
		}
		const tilt = q.lean * 0.4 + (q.head ?? 0);
		head.setAttribute('transform', `translate(${P1(hc)}) rotate(${f1(tilt / DEG)})`);
		// legs
		const kneeSide = (q.knees ?? 1) * KNEE as 1 | -1;
		const legOut = (Lg: ReturnType<typeof makeLeg>, h0: Pt, ankle: Pt, ang: number, by: [number, number] | null | undefined) => {
			const res = by ? { ...fk(h0, Xa(by[0]), clamp(by[1], 0, LIMITS.knee[1]), th, sh, kneeSide), bend: clamp(by[1], 0, LIMITS.knee[1]) } : ik(h0, X(ankle), th, sh, kneeSide);
			Lg.leg.draw(h0, res.j, res.end, ang);
			return { h0, ...res, want: by ? res.end : X(ankle) };
		};
		const lf = legOut(farL, at(0, -0.04 * W), q.ankles[1], q.feet[1], q.legs?.[1]);
		const ln = legOut(nearL, at(0, 0.04 * W), q.ankles[0], q.feet[0], q.legs?.[0]);
		if (nearTrunk) {
			const k = 0.3;
			nearTrunk.setAttribute('d', `M${P1(ln.h0)} L${P1({ x: ln.h0.x + (ln.j.x - ln.h0.x) * k, y: ln.h0.y + (ln.j.y - ln.h0.y) * k })}`);
		}
		// arms and hands
		const af = placeArm(farArm, at(L - 0.03 * u, 0.06 * W), q.hands[1], 'L');
		const an = placeArm(nearArm, at(L - 0.03 * u, -0.02 * W), q.hands[0], 'R');
		farArm.draw(af.s0, af.j, af.w);
		nearArm.draw(an.s0, an.j, an.w);
		if (q.poleTips) {
			// a pole passes through the grip and a little above it
			const pole = (e: SVGPathElement | null, a: ArmOut, tip: Pt) => {
				if (!e) return;
				const gp = X(a.got);
				const tp = X(tip);
				const v = sub(gp, tp);
				const l = Math.hypot(v.x, v.y) || 1;
				e.setAttribute('d', `M${P1({ x: gp.x + (v.x / l) * 0.04 * u, y: gp.y + (v.y / l) * 0.04 * u })} L${P1(tp)}`);
			};
			pole(farPole, af, q.poleTips[1]);
			pole(nearPole, an, q.poleTips[0]);
		}
		frameNo++;
		publish(id, () => ({
			kind: clothes,
			name: o.name ?? '',
			legacy,
			age: o.age ?? 'adult',
			dir,
			frame: frameNo,
			u,
			bones: { upper: ua, fore: fa, thigh: th, shin: sh },
			joints: {
				hip, neck: at(L, 0), head: hc,
				shoulder: [an.s0, af.s0], elbow: [an.j, af.j], wrist: [an.w, af.w],
				hipL: [ln.h0, lf.h0], knee: [ln.j, lf.j], ankle: [ln.end, lf.end],
			},
			angles: {
				elbow: [an.bend, af.bend], knee: [ln.bend, lf.bend], wrist: [an.wristAngle, af.wristAngle], head: (q.head ?? 0) - 0.6 * q.lean, // the head against the body
				kneeSide,
			},
			hands: [nearArm.hand, farArm.hand].map((h) => ({ ...h.debug, bbox: box(h.g) })),
			contacts: [an, af].map((a, i) => ({ hand: i === 0 ? 'near' : 'far', pose: a.pose, name: a.contact ?? '', want: a.target, got: a.got, tol: Math.max(1.5, 0.15 * Lh) })),
			feet: [ln, lf].map((l, i) => ({ planted: !!q.planted?.[i], at: l.end, want: l.want, gear: clothes === 'winter' ? o.gear ?? 'boot' : '' })),
		}));
		return { grips: [an.frame, af.frame], shoulders: [X(an.s0), X(af.s0)], elbows: [X(an.j), X(af.j)], wrists: [X(an.w), X(af.w)], knees: [X(ln.j), X(lf.j)] };
	};
	/** The shoulder joints for a pose (caller coordinates), to pose the arms by angles with fk(). */
	const shoulders = (hip: Pt, lean: number): [Pt, Pt] => {
		const h = X(hip);
		const ax = Math.sin(lean);
		const ay = -Math.cos(lean);
		const at = (a: number, b: number): Pt => X({ x: h.x + ax * a - ay * b, y: h.y + ay * a + ax * b });
		return [at(L - 0.03 * u, -0.02 * W), at(L - 0.03 * u, 0.06 * W)];
	};
	/** Puts the far parts of hand i (0 near, 1 far) into `layer`, which the caller draws behind the held object. */
	const backLayer = (i: 0 | 1, layer: Element | null) => (i === 0 ? nearArm : farArm).hand.setBack(layer && dir < 0 ? mk(layer, 'g', { transform: 'scale(-1 1)' }) : layer);
	return Object.assign(pose, { pose, shoulders, backLayer, id, bones: { upper: ua, fore: fa, thigh: th, shin: sh, hand: Lh, u } });
};
export type Figure = ReturnType<typeof figure>;

const box = (e: Element) => {
	const b = e.getBoundingClientRect();
	return { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height };
};
/** Distance helper for callers that check a contact themselves. */
export const contactError = (a: Pt, b: Pt) => dist(a, b);
