/**
 * A forearm and a hand coming into a picture from its edge (the rest of the person stays outside the frame), drawn on
 * top of the people kit: the hand is the kit's hand (hand.ts: palm, thumb and four fingers, its poses and contact
 * points), the forearm keeps its length (SKELETON adult: forearm 0,135 H = 1,29 hand lengths), and the wrist stays
 * within ±70° (`bend`). Used by the opening scenes of grade 8 and 10 that show only a hand.
 *
 * A pose: `at` = where the contact point of the hand pose goes (fingertip for point/tap, grip axis for grip, middle of
 * the palm for flat), `fore` = the screen angle of the forearm (elbow → wrist), `bend` = the wrist bend (fingers
 * against the forearm, rad, clamped to ±70°, or ±40° when the hand is seen from its back or palm), `roll` as in hand.ts (default: the back of the hand to the viewer),
 * `shoulder` = the shoulder joint (the elbow then comes from two-bone IK), or `upper` = the screen angle of the upper arm (shoulder → elbow) when the elbow is inside the frame (otherwise the
 * sleeve runs on straight past the elbow, out of the frame, `len` hand lengths from the wrist).
 * Colors: the kit classes `${prefix}-skin`, `${prefix}-outline` (PeopleStyles.astro); the sleeve color is a CSS color.
 */
import { DEG, ELBOW, P1, angleOf, clamp, f1, ik, mk, sub, wrap, type Pt } from '@components/people/core';
import { contactLocal, hand, handPoint, handShape, wristFor, type Covering, type HandPose, type HandShape, type Side, type V3 } from '@components/people/hand';

export interface ArmHandOpts {
	Lh: number; // px, wrist to the tip of the middle finger
	side?: Side; // 'R' (default): a right hand, thumb up when the back faces the viewer and the fingers point right
	sleeve: string; // CSS color of the sleeve
	prefix?: string; // kit class prefix (default hm)
	covering?: Covering;
	cuff?: number; // bare forearm between the cuff and the wrist, hand lengths (default 0,3; 0 = to the wrist)
}
export interface ArmHandPose {
	at: Pt;
	pose: HandPose;
	fore?: number; // required without `shoulder`
	bend?: number;
	dir?: number; // instead of `bend`: the screen direction of the fingers (the wrist limit still holds)
	shoulder?: Pt; // the shoulder joint: the elbow is found by two-bone IK (bones of fixed length, the elbow down/back)
	roll?: number;
	d?: number; // grip diameter, hand lengths (default 0,17 = 3 см for an adult)
	shape?: HandShape; // a ready (blended) shape
	contact?: V3; // the point of the hand that goes to `at` (local, hand lengths; default: the pose's contact point)
	upper?: number;
	len?: number; // hand lengths of sleeve from the wrist when there is no `upper` (default 10)
}

export const FORE = 0.135 / 0.105; // forearm, hand lengths
export const UPPER = 0.18 / 0.105; // upper arm, hand lengths

export const armHand = (parent: Element, o: ArmHandOpts) => {
	const p = o.prefix ?? 'hm';
	const side = o.side ?? 'R';
	const Lh = o.Lh;
	const g = mk(parent, 'g', { class: 'pk-arm' });
	const wSleeve = 0.62 * Lh;
	const wSkin = 0.36 * Lh;
	const ow = Math.max(1, 0.06 * Lh);
	const skinO = mk(g, 'path', { class: `${p}-outline`, 'stroke-width': f1(wSkin + ow) });
	const skin = mk(g, 'path', { class: `${p}-limb-skin`, 'stroke-width': f1(wSkin), fill: 'none', 'stroke-linecap': 'round' });
	const cls = o.covering === 'glove' ? `${p}-glove` : o.covering === 'mitten' ? `${p}-mitten` : `${p}-skin`;
	const hd = hand(g, { cls, side, Lh, covering: o.covering });
	const sleeveO = mk(g, 'path', { class: `${p}-outline`, 'stroke-width': f1(wSleeve + ow), style: 'stroke-linecap:butt' });
	const sleeve = mk(g, 'path', { 'stroke-width': f1(wSleeve), fill: 'none', 'stroke-linejoin': 'round', style: `stroke:${o.sleeve}` });
	const cuff = (o.cuff ?? 0.3) * Lh;
	/** Places the arm; returns the wrist, the contact point reached and the hand frame (for attaching a held object). */
	const set = (q: ArmHandPose) => {
		const roll = q.roll ?? -Math.PI / 2;
		// as the kit: ±70° when the hand bends toward its palm or back, ±40° when it bends sideways (seen from the back)
		const lim = (Math.abs(Math.cos(roll)) > 0.5 ? 70 : 40) * DEG;
		const dLh = q.d ?? 0.17;
		const shape = q.shape ?? handShape(q.pose, dLh);
		const cl = q.contact ?? contactLocal(q.pose, shape, dLh);
		let fore = q.fore ?? 0;
		const dirOf = (fo: number) => fo + clamp(q.dir !== undefined ? wrap(q.dir - fo) : q.bend ?? 0, -lim, lim);
		let wrist = wristFor(side, q.at, dirOf(fore), roll, Lh, cl);
		let upper = q.upper;
		if (q.shoulder) {
			for (let it = 0; it < 6; it++) {
				const r = ik(q.shoulder, wristFor(side, q.at, dirOf(fore), roll, Lh, cl), UPPER * Lh, FORE * Lh, ELBOW);
				fore = angleOf(sub(r.end, r.j));
				upper = angleOf(sub(r.j, q.shoulder));
				wrist = r.end;
			}
		}
		const dir = dirOf(fore);
		if (!q.shoulder) wrist = wristFor(side, q.at, dir, roll, Lh, cl);
		hd.set({ wrist, dir, roll }, shape, q.pose, cl);
		const u = { x: Math.cos(fore), y: Math.sin(fore) };
		const along = (k: number): Pt => ({ x: wrist.x - u.x * k * Lh, y: wrist.y - u.y * k * Lh });
		const c0 = along(0.08 + cuff / Lh);
		const elbow = along(FORE);
		let d: string;
		if (upper !== undefined) {
			const sh = { x: elbow.x - Math.cos(upper) * UPPER * Lh, y: elbow.y - Math.sin(upper) * UPPER * Lh };
			const far = { x: sh.x - Math.cos(upper) * 2 * Lh, y: sh.y - Math.sin(upper) * 2 * Lh };
			d = `M${P1(c0)} L${P1(elbow)} L${P1(far)}`;
		} else d = `M${P1(c0)} L${P1(along(q.len ?? 10))}`;
		const s0 = along(0.05);
		skin.setAttribute('d', `M${P1(s0)} L${P1(along(0.08 + cuff / Lh + 0.1))}`);
		skinO.setAttribute('d', skin.getAttribute('d')!);
		sleeve.setAttribute('d', d);
		sleeveO.setAttribute('d', d);
		const at = (pl: V3) => handPoint(side, { wrist, dir, roll }, Lh, pl); // a point of the hand (local, hand lengths)
		return { wrist, got: at(cl), dir, elbow, at };
	};
	/** Puts the far parts of the fingers into `layer` (drawn by the caller behind the held object). */
	const backLayer = (layer: Element | null) => hd.setBack(layer);
	return { g, set, backLayer, hand: hd };
};
